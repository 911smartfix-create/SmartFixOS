// =============================================
// SmartFixOS — Cliente local sin Base44
// =============================================
// ✅ Objetivo:
// - Eliminar por completo la dependencia de @base44/agent
// - Mantener el mismo API: base44.auth, base44.entities, base44.functions
// - Usar almacenamiento local (localStorage / memoria) por ahora
// - Listo para conectar luego a Convex sin tocar 140 archivos
// =============================================

// 👈 Utilidades internas
const isBrowser = typeof window !== "undefined";
const memoryStore = {}; // { [entityName]: Array<record> }
let currentUser = null;

// ---- helpers de storage ----
function getStore(entity) {
  if (!memoryStore[entity]) {
    if (isBrowser) {
      try {
        const raw = window.localStorage.getItem(`sfos_${entity}`);
        memoryStore[entity] = raw ? JSON.parse(raw) : [];
      } catch (e) {
        console.warn("SmartFixOS: error leyendo localStorage para", entity, e);
        memoryStore[entity] = [];
      }
    } else {
      memoryStore[entity] = [];
    }
  }
  return memoryStore[entity];
}

function saveStore(entity) {
  if (!isBrowser) return;
  try {
    window.localStorage.setItem(
      `sfos_${entity}`,
      JSON.stringify(memoryStore[entity] || [])
    );
  } catch (e) {
    console.warn("SmartFixOS: error guardando localStorage para", entity, e);
  }
}

function generateId() {
  if (isBrowser && window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }
  return `sfos_${Math.random().toString(36).slice(2)}${Date.now()}`;
}

function applyOrder(records, orderBy) {
  if (!orderBy || !Array.isArray(records)) return records;

  let field = orderBy;
  let desc = false;

  if (orderBy.startsWith("-")) {
    desc = true;
    field = orderBy.slice(1);
  }

  const sorted = [...records].sort((a, b) => {
    const av = a[field];
    const bv = b[field];

    if (av === bv) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;

    if (av < bv) return desc ? 1 : -1;
    if (av > bv) return desc ? -1 : 1;
    return 0;
  });

  return sorted;
}

// ---- Cliente genérico por entidad ----
function createEntityClient(entityName) {
  return {
    // lista simple
    async list(orderBy, limit) {
      const store = getStore(entityName);
      let records = applyOrder(store, orderBy);
      if (typeof limit === "number") {
        records = records.slice(0, limit);
      }
      return records;
    },

    // filtro simple { campo: valor }
    async filter(filters = {}, orderBy, limit) {
      const store = getStore(entityName);
      let records = store.filter((rec) => {
        return Object.entries(filters).every(([k, v]) => rec[k] === v);
      });

      records = applyOrder(records, orderBy);
      if (typeof limit === "number") {
        records = records.slice(0, limit);
      }
      return records;
    },

    async get(id) {
      if (!id) return null;
      const store = getStore(entityName);
      return store.find((rec) => rec.id === id) || null;
    },

    async create(data) {
      const store = getStore(entityName);
      const now = new Date().toISOString();
      const record = {
        id: data.id || generateId(),
        ...data,
        created_date: data.created_date || now,
        updated_date: data.updated_date || now,
      };
      store.push(record);
      saveStore(entityName);
      return record;
    },

    async update(id, patch) {
      if (!id) throw new Error(`update(${entityName}): id requerido`);
      const store = getStore(entityName);
      const idx = store.findIndex((rec) => rec.id === id);
      if (idx === -1) {
        throw new Error(`update(${entityName}): registro no encontrado: ${id}`);
      }
      const now = new Date().toISOString();
      const updated = {
        ...store[idx],
        ...patch,
        updated_date: now,
      };
      store[idx] = updated;
      saveStore(entityName);
      return updated;
    },

    async delete(id) {
      if (!id) return;
      const store = getStore(entityName);
      const next = store.filter((rec) => rec.id !== id);
      memoryStore[entityName] = next;
      saveStore(entityName);
      return { success: true };
    },
  };
}

// ---- Auth local (sin Base44) ----
function loadUser() {
  if (!isBrowser) {
    return (
      currentUser || {
        id: "local-admin",
        full_name: "SmartFixOS Admin",
        email: "admin@local",
        role: "admin",
      }
    );
  }

  if (currentUser) return currentUser;

  try {
    const raw = window.localStorage.getItem("sfos_user");
    if (raw) {
      currentUser = JSON.parse(raw);
      return currentUser;
    }
  } catch (e) {
    console.warn("SmartFixOS: error leyendo usuario de localStorage", e);
  }

  // Usuario por defecto
  currentUser = {
    id: "local-admin",
    full_name: "SmartFixOS Admin",
    email: "admin@local",
    role: "admin",
  };
  try {
    window.localStorage.setItem("sfos_user", JSON.stringify(currentUser));
  } catch {}
  return currentUser;
}

const auth = {
  // usado en casi toda la app
  async me() {
    return loadUser();
  },

  async updateMe(patch) {
    const existing = loadUser();
    const next = { ...existing, ...patch };
    currentUser = next;
    if (isBrowser) {
      try {
        window.localStorage.setItem("sfos_user", JSON.stringify(next));
      } catch {}
    }
    return next;
  },

  async redirectToLogin(nextUrl) {
    console.info(
      "[SmartFixOS] redirectToLogin (modo local, sin Base44)",
      nextUrl || ""
    );
    // En modo local no hay login real; podríamos mostrar una pantalla custom en el futuro.
  },

  async logout(redirectUrl) {
    currentUser = null;
    if (isBrowser) {
      try {
        window.localStorage.removeItem("sfos_user");
      } catch {}
      if (redirectUrl) {
        window.location.href = redirectUrl;
      }
    }
  },
};

// ---- functions.call stub (para no romper nada) ----
const functions = {
  async call(name, payload) {
    console.info(
      `[SmartFixOS] functions.call("${name}") (stub sin Base44)`,
      payload
    );
    // Aquí luego conectamos con Convex (o el backend real).
    return null;
  },
};

// ---- Proxy para entities: base44.entities.CualquierNombre ----
const entities = new Proxy(
  {},
  {
    get(target, prop) {
      if (typeof prop !== "string") {
        return target[prop];
      }
      if (!target[prop]) {
        target[prop] = createEntityClient(prop);
      }
      return target[prop];
    },
  }
);

// ---- Export público compatible ----
export const base44 = {
  auth,
  entities,
  functions,
};

// Export default por si en algún lado lo usan así
export default base44;
