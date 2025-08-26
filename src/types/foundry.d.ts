// Foundry VTT Type Definitions
declare global {
  interface Game {
    system: {
      id: string;
    };
    packs: Map<string, CompendiumCollection<CompendiumDocument>>;
    settings: {
      set(module: string, key: string, value: any): Promise<any>;
      get(module: string, key: string): any;
    };
    pf2e?: {
      compendiumBrowser?: {
        settings?: {
          equipment?: Record<string, {
            load: boolean;
            name: string;
          }>;
          action?: Record<string, any>;
          bestiary?: Record<string, any>;
          campaignFeature?: Record<string, any>;
          hazard?: Record<string, any>;
          feat?: Record<string, any>;
          spell?: Record<string, any>;
        };
        initCompendiumList?(): void;
        resetInitializedTabs?(): void;
        loadedPacks?(category: string): string[];
      };
    };
  }

  interface CompendiumCollection<T extends CompendiumDocument> {
    metadata: {
      name: string;
      label: string;
      path: string;
      type: string;
      system: string;
    };
    getIndex(): Promise<Collection<string, CompendiumIndexData>>;
    getDocument(id: string): Promise<T>;
  }

  interface CompendiumDocument {
    _id: string;
    name: string;
    type: string;
    system: any;
  }

  interface CompendiumIndexData {
    _id: string;
    name: string;
    type: string;
    img?: string;
  }

  interface Collection<K, V> {
    size: number;
    keys(): IterableIterator<K>;
    values(): IterableIterator<V>;
    get(key: K): V | undefined;
  }

  interface Hooks {
    once(event: string, callback: Function): void;
    on(event: string, callback: Function): void;
  }

  const game: Game;
  const Hooks: Hooks;
}

export {};
