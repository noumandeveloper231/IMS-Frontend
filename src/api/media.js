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
  upload: (formData) =>
    api.post("/media/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }).then((r) => r.data),
  getById: (id) => api.get(`/media/${id}`).then((r) => r.data),
  delete: (id, deleteFromCloud = false) =>
    api.delete(`/media/${id}${deleteFromCloud ? "?deleteFromCloud=1" : ""}`).then((r) => r.data),
};
