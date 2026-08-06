// default.tsx only covers a hard navigation/refresh; on client-side
// navigation Next keeps this slot's last active route mounted, so without
// this catch-all the settings modal would stay open over whatever page a
// learner navigates to next (e.g. clicking the logo after opening Settings).
export default function CatchAll() {
  return null;
}
