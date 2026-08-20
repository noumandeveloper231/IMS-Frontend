import api from "../utils/api";

export const mediaApi = {
  list: (params) =>
    api.get("/media", {
      params: {
        page: params?.page || 1,
        limit: params?.limit ?? 100,
        search: params?.search,
        folder: params?.folder,
        dateFrom: params?.dateFrom,
        dateTo: params?.dateTo,
      },
    }).then((r) => r.data),
  listFolders: () => api.get("/media/folders").then((r) => r.data),
  createFolder: (body) => api.post("/media/folders", body).then((r) => r.data),
  upload: (formData) =>
    api.post("/media/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }).then((r) => r.data),
  getById: (id) => api.get(`/media/${id}`).then((r) => r.data),
  delete: (id, deleteFromCloud = false) =>
    api.delete(`/media/${id}${deleteFromCloud ? "?deleteFromCloud=1" : ""}`).then((r) => r.data),
  update: (id, body) => api.patch(`/media/${id}`, body).then((r) => r.data),
  moveToFolder: (mediaIds, folder) =>
    api.post("/media/move", { mediaIds, folder }).then((r) => r.data),
  copyToFolder: (mediaIds, folder) =>
    api.post("/media/copy", { mediaIds, folder }).then((r) => r.data),
  deleteFolder: (path, deleteFromCloud = true) =>
    api.delete(`/media/folders/delete?path=${encodeURIComponent(path)}${deleteFromCloud ? "&deleteFromCloud=1" : ""}`).then((r) => r.data),
};
