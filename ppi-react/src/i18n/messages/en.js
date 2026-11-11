import auth from "./en/auth.js";
import core from "./en/core.js";
import integrations from "./en/integrations.js";
import publicUi from "./en/public.js";
import services from "./en/services.js";
import tasks from "./en/tasks.js";

export default { ...core, ...auth, ...tasks, ...integrations, ...publicUi, ...services };
