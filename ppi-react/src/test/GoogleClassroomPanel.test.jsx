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
  courseName: "Biología",
  date: "2026-11-05",
  time: "16:00",
  classroomUrl: "https://classroom.google.com/c/biology",
};

beforeEach(() => {
  mockListAssignments.mockReset();
  mockListAssignments.mockResolvedValue({ courses: [{ id: "biology", name: "Biología" }], assignments: [assignment] });
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
    fireEvent.click(screen.getByRole("button", { name: /agregar alarma/i }));

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
});
