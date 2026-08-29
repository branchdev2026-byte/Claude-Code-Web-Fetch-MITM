import { loadConfig } from "./config";
import { installInterceptor } from "./interceptor";

installInterceptor(loadConfig());
