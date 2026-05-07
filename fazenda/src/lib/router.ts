type RouteHandler = (params: Record<string, string>) => void | Promise<void>;

interface Route {
  pattern: RegExp;
  keys: string[];
  handler: RouteHandler;
}

const routes: Route[] = [];
let notFoundHandler: RouteHandler = () => {
  document.getElementById("app")!.innerHTML =
    '<div class="empty-state"><h2>Pagina nao encontrada</h2></div>';
};

function pathToRegex(path: string): { pattern: RegExp; keys: string[] } {
  const keys: string[] = [];
  const pattern = path
    .replace(/:([^/]+)/g, (_: string, key: string) => {
      keys.push(key);
      return "([^/]+)";
    })
    .replace(/\//g, "\\/");
  return { pattern: new RegExp(`^${pattern}$`), keys };
}

export const router = {
  on(path: string, handler: RouteHandler) {
    const { pattern, keys } = pathToRegex(path);
    routes.push({ pattern, keys, handler });
    return router;
  },

  notFound(handler: RouteHandler) {
    notFoundHandler = handler;
    return router;
  },

  navigate(path: string) {
    window.location.hash = path;
  },

  start() {
    const resolve = async () => {
      const hash = window.location.hash.slice(1) || "/";
      let matched = false;
      for (const route of routes) {
        const match = hash.match(route.pattern);
        if (match) {
          const params: Record<string, string> = {};
          route.keys.forEach((key, i) => {
            params[key] = match[i + 1];
          });
          await route.handler(params);
          matched = true;
          break;
        }
      }
      if (!matched) await notFoundHandler({});
    };
    window.addEventListener("hashchange", resolve);
    resolve();
  },
};

export function navigate(path: string) {
  router.navigate(path);
}
