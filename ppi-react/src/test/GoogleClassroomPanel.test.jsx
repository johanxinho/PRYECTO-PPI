import { fireEvent, render as testingRender, screen, waitFor } from "@testing-library/react";
import { I18nProvider } from "../i18n/I18nProvider";
const render = (ui, options) => testingRender(<I18nProvider>{ui}</I18nProvider>, options);
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockListAssignments, mockConnectGoogleClassroom, mockDisconnectGoogleClassroom, mockPrepareGoogleClassroom, mockRestoreGoogleClassroomSession } = vi.hoisted(() => ({
  mockListAssignments: vi.fn(),
  mockConnectGoogleClassroom: vi.fn(),
  mockDisconnectGoogleClassroom: vi.fn(),
  mockPrepareGoogleClassroom: vi.fn(),
  mockRestoreGoogleClassroomSession: vi.fn(),
}));
vi.mock("../services/googleClassroomService", () => ({
  connectGoogleClassroom: (...args) => mockConnectGoogleClassroom(...args),
  disconnectGoogleClassroom: (...args) => mockDisconnectGoogleClassroom(...args),
  isGoogleClassroomConfigured: true,
  listClassroomAssignments: (...args) => mockListAssignments(...args),
  prepareGoogleClassroom: (...args) => mockPrepareGoogleClassroom(...args),
  restoreGoogleClassroomSession: (...args) => mockRestoreGoogleClassroomSession(...args),
}));

import GoogleClassroomPanel from "../components/GoogleClassroomPanel";

const assignment = {
  id: "classroom:biology:task-1",
  externalId: "biology:task-1",
  source: "google_classroom",
  title: "Entrega de ecosistemas",
  courseId: "biology",
  courseName: "Biología",
  date: "2026-11-05",
  time: "16:00",
  classroomUrl: "https://classroom.google.com/c/biology",
};

beforeEach(() => {
  window.localStorage.setItem("recordate_language", "es");
  mockListAssignments.mockReset();
  mockConnectGoogleClassroom.mockReset().mockResolvedValue({ token: "test-token" });
  mockDisconnectGoogleClassroom.mockReset();
  mockPrepareGoogleClassroom.mockReset().mockResolvedValue(true);
  mockRestoreGoogleClassroomSession.mockReset().mockReturnValue(null);
  mockListAssignments.mockResolvedValue({
    courses: [{ id: "biology", name: "Biología" }],
    assignments: [assignment],
  });
});

describe("GoogleClassroomPanel", () => {
  it("prepara Google Identity Services al abrir el panel sin pedir consentimiento", () => {
    render(<GoogleClassroomPanel profile={{ role: "estudiante" }} tasks={[]} onImport={vi.fn()} />);

    expect(mockPrepareGoogleClassroom).toHaveBeenCalledTimes(1);
  });

  it("restaura el rol y vuelve a cargar cursos tras una recarga sin pedir OAuth otra vez", async () => {
    mockRestoreGoogleClassroomSession.mockReturnValue({ staff: false, expiresAt: Date.now() + 3_600_000 });
    render(<GoogleClassroomPanel profile={{ role: "profesor" }} tasks={[]} onImport={vi.fn()} />);

    expect(screen.getByLabelText("Rol de esta cuenta en Google Classroom")).toHaveValue("student");
    await waitFor(() => expect(mockListAssignments).toHaveBeenCalledWith({ staff: false }));
    expect(await screen.findByRole("button", { name: /actualizar cursos/i })).toBeEnabled();
    expect(mockConnectGoogleClassroom).not.toHaveBeenCalled();
  });

  it("pasa a RECORDATE la anticipación de alarma elegida para la actividad", async () => {
    const onImport = vi.fn().mockResolvedValue(true);
    render(<GoogleClassroomPanel profile={{ role: "estudiante" }} tasks={[]} onImport={onImport} />);

    fireEvent.click(screen.getByRole("button", { name: /conectar google classroom/i }));
    await screen.findByText("Entrega de ecosistemas");
    expect(mockConnectGoogleClassroom).toHaveBeenCalledWith({ staff: false, selectAccount: true });

    fireEvent.change(screen.getByRole("combobox", { name: "Anticipación de alarma para Entrega de ecosistemas" }), {
      target: { value: "1 hora antes" },
    });
    fireEvent.click(screen.getByRole("button", { name: /agregar tarea y alarma/i }));

    await waitFor(() => expect(onImport).toHaveBeenCalledWith(assignment, "1 hora antes"));
  });

  it("usa el rol docente seleccionado, sin pedir permisos de escritura", async () => {
    render(<GoogleClassroomPanel profile={{ role: "estudiante" }} tasks={[]} onImport={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Rol de esta cuenta en Google Classroom"), {
      target: { value: "staff" },
    });
    fireEvent.click(screen.getByRole("button", { name: /conectar google classroom/i }));

    await screen.findByText("Entrega de ecosistemas");
    expect(mockConnectGoogleClassroom).toHaveBeenCalledWith({ staff: true, selectAccount: true });
    expect(mockListAssignments).toHaveBeenCalledWith({ staff: true });
  });

  it("revoca la sesión anterior y permite elegir otra cuenta o rol", async () => {
    render(<GoogleClassroomPanel profile={{ role: "estudiante" }} tasks={[]} onImport={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /conectar google classroom/i }));
    await screen.findByText("Entrega de ecosistemas");
    fireEvent.click(await screen.findByRole("button", { name: /cambiar cuenta o rol/i }));

    await waitFor(() => {
      expect(mockDisconnectGoogleClassroom).toHaveBeenCalledTimes(1);
      expect(mockConnectGoogleClassroom).toHaveBeenCalledTimes(2);
    });
    expect(mockConnectGoogleClassroom).toHaveBeenNthCalledWith(2, { staff: false, selectAccount: true });
  });

  it("marca como agregada y bloquea una actividad ya importada", async () => {
    const onImport = vi.fn();
    render(
      <GoogleClassroomPanel
        profile={{ role: "estudiante" }}
        tasks={[{ source: "google_classroom", externalId: assignment.externalId }]}
        onImport={onImport}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /conectar google classroom/i }));
    await screen.findByText("Entrega de ecosistemas");

    const addButton = screen.getByRole("button", { name: "Agregada" });
    expect(addButton).toBeDisabled();
    expect(onImport).not.toHaveBeenCalled();
  });

  it("informa cuando algunos cursos no se pudieron consultar", async () => {
    mockListAssignments.mockResolvedValue({
      courses: [{ id: "biology", name: "Biología" }],
      assignments: [assignment],
      failedCourseCount: 1,
      skippedCourseCount: 2,
    });
    render(<GoogleClassroomPanel profile={{ role: "estudiante" }} tasks={[]} onImport={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /conectar google classroom/i }));

    expect(await screen.findByRole("status")).toHaveTextContent(/carga parcial/i);
    expect(screen.getByRole("status")).toHaveTextContent(/1 curso no se pudo consultar/);
    expect(screen.getByRole("status")).toHaveTextContent(/2 cursos fuera del límite de consulta/);
  });

  it("muestra un error 403 localizado y accionable sin exponer el mensaje bruto de Google", async () => {
    mockListAssignments.mockResolvedValue({
      courses: [{ id: "biology", name: "Biología" }],
      assignments: [],
      failedCourseCount: 1,
      failedCourses: [{
        courseId: "biology",
        courseName: "Biología",
        status: 403,
        message: "HTTP 403: Request had insufficient authentication scopes.",
      }],
    });
    render(<GoogleClassroomPanel profile={{ role: "estudiante" }} tasks={[]} onImport={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /conectar google classroom/i }));

    expect(await screen.findByRole("status")).toHaveTextContent(/Google negó el acceso de lectura/i);
    expect(screen.getByText(/No se pudieron cargar las tareas/)).toHaveTextContent(/Google negó el acceso de lectura/i);
    expect(screen.queryByText(/insufficient authentication scopes/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Cambiar cuenta o rol/ })).toBeInTheDocument();
    expect(screen.queryByText("No hay tareas publicadas en esta materia.")).not.toBeInTheDocument();
  });

  it("agrupa las tareas bajo el nombre de su materia", async () => {
    const mathAssignment = {
      ...assignment,
      id: "classroom:math:task-2",
      externalId: "math:task-2",
      title: "Ejercicios de álgebra",
      courseId: "math",
      courseName: "Matemáticas",
      classroomUrl: "https://classroom.google.com/c/math",
    };
    mockListAssignments.mockResolvedValue({
      courses: [
        { id: "biology", name: "Biología" },
        { id: "math", name: "Matemáticas" },
      ],
      assignments: [assignment, mathAssignment],
    });
    render(<GoogleClassroomPanel profile={{ role: "estudiante" }} tasks={[]} onImport={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /conectar google classroom/i }));

    const biologyHeading = await screen.findByRole("heading", { name: "Biología" });
    const mathHeading = screen.getByRole("heading", { name: "Matemáticas" });
    expect(biologyHeading.closest("section")).toHaveTextContent("Entrega de ecosistemas");
    expect(mathHeading.closest("section")).toHaveTextContent("Ejercicios de álgebra");
  });

  it("permite asignar fecha y hora antes de importar una tarea sin vencimiento", async () => {
    const undatedAssignment = {
      ...assignment,
      id: "classroom:biology:task-undated",
      externalId: "biology:task-undated",
      title: "Lectura sin fecha",
      date: "",
      time: "",
    };
    mockListAssignments.mockResolvedValue({
      courses: [{ id: "biology", name: "Biología" }],
      assignments: [undatedAssignment],
    });
    const onImport = vi.fn().mockResolvedValue(true);
    render(<GoogleClassroomPanel profile={{ role: "estudiante" }} tasks={[]} onImport={onImport} />);

    fireEvent.click(screen.getByRole("button", { name: /conectar google classroom/i }));
    await screen.findByText("Lectura sin fecha");
    const addButton = screen.getByRole("button", { name: /agregar tarea y alarma/i });
    expect(addButton).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Fecha para RECORDATE: Lectura sin fecha"), {
      target: { value: "2026-11-06" },
    });
    fireEvent.change(screen.getByLabelText("Hora para la alarma: Lectura sin fecha"), {
      target: { value: "14:30" },
    });
    fireEvent.click(addButton);

    await waitFor(() =>
      expect(onImport).toHaveBeenCalledWith(
        { ...undatedAssignment, date: "2026-11-06", time: "14:30" },
        "30 minutos antes",
      ),
    );
  });

  it("muestra un aviso si RECORDATE rechaza la importación", async () => {
    const onImport = vi.fn().mockResolvedValue(false);
    render(<GoogleClassroomPanel profile={{ role: "estudiante" }} tasks={[]} onImport={onImport} />);
    fireEvent.click(screen.getByRole("button", { name: /conectar google classroom/i }));
    await screen.findByText("Entrega de ecosistemas");
    fireEvent.click(screen.getByRole("button", { name: /agregar tarea y alarma/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/no se agregó la actividad/i);
  });
});
