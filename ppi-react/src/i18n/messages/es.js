import auth from "./es/auth.js";
import core from "./es/core.js";
import integrations from "./es/integrations.js";
import publicUi from "./es/public.js";
import services from "./es/services.js";
import tasks from "./es/tasks.js";

export default { ...core, ...auth, ...tasks, ...integrations, ...publicUi, ...services };
