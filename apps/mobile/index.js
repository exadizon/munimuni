import { registerRootComponent } from 'expo';
import App from './App';

// Local entry point (instead of `expo/AppEntry`): in this monorepo the
// `expo` package is hoisted to the workspace root, so the shared
// `expo/AppEntry` would resolve `../../App` outside this project.
// Registering here keeps entry resolution inside `apps/mobile`.
registerRootComponent(App);
