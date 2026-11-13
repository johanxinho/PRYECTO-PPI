import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";

function installGoogleTokenMock() {
  let tokenConfig;
  window.google = {
    accounts: {
      oauth2: {
        initTokenClient: vi.fn((config) => {
          tokenConfig = config;
          return {
            requestAccessToken: vi.fn(() => {
              queueMicrotask(() =>
                config.callback({
                  access_token: "test-drive-token",
                  expires_in: 3600,
                  scope: DRIVE_SCOPE,
                })
              );
            }),
          };
        }),
        revoke: vi.fn(),
      },
    },
  };
  return () => tokenConfig;
}

describe("googleDriveService", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("VITE_GOOGLE_CLIENT_ID", "test-client-id.apps.googleusercontent.com");
  });

  afterEach(() => {
    delete window.google;
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("solicita el permiso drive.file y permite buscar archivos de la app", async () => {
    const getTokenConfig = installGoogleTokenMock();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ files: [{ id: "file-1", name: "Notas" }], nextPageToken: "next-page" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { connectGoogleDrive, listDriveFiles } = await import("../services/googleDriveService");
    await connectGoogleDrive();
    const result = await listDriveFiles({ search: "biology's notes" });

    expect(getTokenConfig().scope).toBe(DRIVE_SCOPE);
    expect(result.files).toEqual([{ id: "file-1", name: "Notas" }]);
    expect(result.nextPageToken).toBe("next-page");
    const [request, init] = fetchMock.mock.calls[0];
    const url = new URL(request);
    expect(url.searchParams.get("q")).toContain("fullText contains");
    expect(url.searchParams.get("includeItemsFromAllDrives")).toBe(null);
    expect(init.headers.Authorization).toBe("Bearer test-drive-token");
    expect(init.credentials).toBe("omit");
  });

  it("usa la carga reanudable de Google para archivos superiores a 5 MB", async () => {
    installGoogleTokenMock();
    const uploadSessionUrl =
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&session=test";
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, status: 200, headers: { get: () => uploadSessionUrl } })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: "large-file", name: "archivo-grande.bin" }),
      });
    vi.stubGlobal("fetch", fetchMock);
    const { connectGoogleDrive, uploadDriveFile } = await import("../services/googleDriveService");
    await connectGoogleDrive();
    const file = new File([new Uint8Array(5 * 1024 * 1024 + 1)], "archivo-grande.bin", {
      type: "application/octet-stream",
    });

    const uploaded = await uploadDriveFile(file);

    expect(uploaded.id).toBe("large-file");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][1].headers["X-Upload-Content-Length"]).toBe(String(file.size));
    expect(fetchMock.mock.calls[1][1].headers["Content-Range"]).toBe(
      `bytes 0-${file.size - 1}/${file.size}`
    );
    expect(fetchMock.mock.calls[1][1].body.size).toBe(file.size);
  });
});
