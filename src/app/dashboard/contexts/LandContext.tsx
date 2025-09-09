"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Land } from "../components/types";

type LandContextType = {
  activeLandId: string | null;
  setActiveLandId: (landId: string | null) => void;
  lands: Land[];
  setLands: (lands: Land[]) => void;
  activeLand: Land | null;
  isLoading: boolean;
  refreshLands: () => Promise<void>;
};

const LandContext = createContext<LandContextType | undefined>(undefined);

export function LandProvider({ children }: { children: ReactNode }) {
  const [activeLandId, setActiveLandId] = useState<string | null>(null);
  const [lands, setLands] = useState<Land[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Get active land object
  const activeLand = lands.find(land => land.id === activeLandId) || null;

  // Load lands and active land from localStorage on mount
  useEffect(() => {
    loadLandsAndActiveLand();
  }, []);

  // Save active land to localStorage when it changes
  useEffect(() => {
    if (activeLandId) {
      localStorage.setItem("agrisense.activeLandId", activeLandId);
    } else {
      localStorage.removeItem("agrisense.activeLandId");
    }
  }, [activeLandId]);

  async function loadLandsAndActiveLand() {
    setIsLoading(true);
    try {
      // Get user code
      const raw = localStorage.getItem("agrisense.user");
      if (!raw) {
        setIsLoading(false);
        return;
      }

      const user = JSON.parse(raw);
      const userCode = user?.code;
      if (!userCode) {
        setIsLoading(false);
        return;
      }

      // Load lands from API
      const resp = await fetch(`/api/profile/get?code=${userCode}`);
      if (!resp.ok) {
        console.error("Failed to load lands");
        setIsLoading(false);
        return;
      }

      const data = await resp.json();
      const loadedLands = data.lands || [];
      setLands(loadedLands);

      // Load active land from localStorage or set first land as default
      const savedActiveLandId = localStorage.getItem("agrisense.activeLandId");
      if (savedActiveLandId && loadedLands.find(land => land.id === savedActiveLandId)) {
        setActiveLandId(savedActiveLandId);
      } else if (loadedLands.length > 0) {
        setActiveLandId(loadedLands[0].id);
      }

      console.info("[LandContext] loaded lands and active land", {
        landsCount: loadedLands.length,
        activeLandId: savedActiveLandId || loadedLands[0]?.id
      });
    } catch (err) {
      console.error("Failed to load lands:", err);
    } finally {
      setIsLoading(false);
    }
  }

  async function refreshLands() {
    await loadLandsAndActiveLand();
  }

  const value: LandContextType = {
    activeLandId,
    setActiveLandId,
    lands,
    setLands,
    activeLand,
    isLoading,
    refreshLands
  };

  return (
    <LandContext.Provider value={value}>
      {children}
    </LandContext.Provider>
  );
}

export function useLand() {
  const context = useContext(LandContext);
  if (context === undefined) {
    throw new Error("useLand must be used within a LandProvider");
  }
  return context;
}
