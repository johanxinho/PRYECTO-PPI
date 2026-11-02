import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockListAssignments } = vi.hoisted(() => ({ mockListAssignments: vi.fn() }));
vi.mock("../services/googleClassroomService", () => ({
  connectGoogleClassroom: vi.fn(),
  disconnectGoogleClassroom: vi.fn(),
  isGoogleClassroomConfigured: true,
  listClassroomAssignments: (...args) => mockListAssignments(...args),
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
  mockListAssignments.mockReset();
  mockListAssignments.mockResolvedValue({
    courses: [{ id: "biology", name: "Biología" }],
    assignments: [assignment],
  });
});

describe("GoogleClassroomPanel", () => {
  it("pasa a RECORDATE la anticipación de alarma elegida para la actividad", async () => {
    const onImport = vi.fn().mockResolvedValue(true);
    render(<GoogleClassroomPanel profile={{ role: "estudiante" }} tasks={[]} onImport={onImport} />);

    fireEvent.click(screen.getByRole("button", { name: /conectar google classroom/i }));
    await screen.findByText("Entrega de ecosistemas");

    fireEvent.change(screen.getByRole("combobox", { name: "Anticipación de alarma para Entrega de ecosistemas" }), {
      target: { value: "1 hora antes" },
    });
    fireEvent.click(screen.getByRole("button", { name: /agregar tarea y alarma/i }));

    await waitFor(() => expect(onImport).toHaveBeenCalledWith(assignment, "1 hora antes"));
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
    expect(screen.getByRole("status")).toHaveTextContent(/2 fuera del límite/);
  });

  it("muestra el error real del curso y no lo confunde con una materia sin tareas", async () => {
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

    expect(await screen.findByText(/HTTP 403: Request had insufficient authentication scopes/)).toBeInTheDocument();
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
