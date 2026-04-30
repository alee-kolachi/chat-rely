"use client";

import type { Dispatch, ReactNode, SetStateAction } from "react";
import { createContext, useContext } from "react";

const SetDashboardTopbarExtrasContext = createContext<Dispatch<SetStateAction<ReactNode>> | null>(null);

export function SetDashboardTopbarExtrasProvider({
  children,
  setExtras,
}: {
  children: ReactNode;
  setExtras: Dispatch<SetStateAction<ReactNode>>;
}) {
  return (
    <SetDashboardTopbarExtrasContext.Provider value={setExtras}>{children}</SetDashboardTopbarExtrasContext.Provider>
  );
}

/** Register extra nodes on the right side of the dashboard screen top bar; clear on unmount. */
export function useSetDashboardTopbarExtras(): Dispatch<SetStateAction<ReactNode>> {
  const set = useContext(SetDashboardTopbarExtrasContext);
  if (!set) {
    throw new Error("useSetDashboardTopbarExtras must be used within SetDashboardTopbarExtrasProvider");
  }
  return set;
}
