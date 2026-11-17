/**
 * The branch staff pick on the sign-in page. It rides in local storage across
 * the sign-in redirect, and the portal claims it once the session exists.
 */
const KEY = "emf-pending-branch";

export function rememberBranch(branch) {
  try {
    if (branch) window.localStorage.setItem(KEY, branch);
  } catch {
    /* storage unavailable — the branch chooser simply reappears after sign-in */
  }
}

export function readPendingBranch() {
  try {
    return window.localStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}

export function clearPendingBranch() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* nothing to clear */
  }
}