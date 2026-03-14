/**
 * ScormManifestParser — Client-side imsmanifest.xml parser.
 * Detects SCORM version, SCOs, resources, and launch files.
 */

export interface ParsedSco {
  identifier: string;
  title: string;
  launchPath: string;
  parameters?: string;
  orderIndex: number;
  scormType: "sco" | "asset";
}

export interface ParsedManifest {
  version: "1.2" | "2004";
  defaultOrganization: string;
  scos: ParsedSco[];
  title: string;
}

/**
 * Parse imsmanifest.xml content and extract SCORM metadata.
 */
export function parseManifest(xmlContent: string): ParsedManifest | null {
  try {
    const doc = new DOMParser().parseFromString(xmlContent, "text/xml");

    // Check for parse errors
    const parseError = doc.querySelector("parsererror");
    if (parseError) return null;

    // Detect SCORM version
    const version = detectVersion(doc);

    // Get organizations
    const orgsEl = doc.querySelector("organizations");
    const defaultOrg = orgsEl?.getAttribute("default") || "";

    // Get default organization element
    const orgEl = defaultOrg
      ? doc.querySelector(`organization[identifier="${defaultOrg}"]`) ||
        doc.querySelector("organization")
      : doc.querySelector("organization");

    const orgTitle =
      orgEl?.querySelector(":scope > title")?.textContent || "Untitled";

    // Build resource map: identifier → href
    const resourceMap = new Map<string, { href: string; type: string }>();
    doc.querySelectorAll("resource").forEach((res) => {
      const id = res.getAttribute("identifier") || "";
      const href = res.getAttribute("href") || "";
      const type = res.getAttribute("scormType") || res.getAttribute("adlcp:scormtype") || res.getAttribute("adlcp:scormType") || "sco";
      if (id) resourceMap.set(id, { href, type });
    });

    // Extract items (SCOs) from organization
    const scos: ParsedSco[] = [];
    if (orgEl) {
      extractItems(orgEl, resourceMap, scos, 0);
    }

    // If no SCOs found from items, try resources directly
    if (scos.length === 0) {
      let idx = 0;
      for (const [id, res] of resourceMap) {
        if (res.href && res.href.endsWith(".html")) {
          scos.push({
            identifier: id,
            title: id,
            launchPath: res.href,
            orderIndex: idx++,
            scormType: res.type === "asset" ? "asset" : "sco",
          });
        }
      }
    }

    return {
      version,
      defaultOrganization: defaultOrg,
      scos,
      title: orgTitle,
    };
  } catch {
    return null;
  }
}

function detectVersion(doc: Document): "1.2" | "2004" {
  const manifest = doc.querySelector("manifest");
  if (!manifest) return "1.2";

  // Check namespace
  const xmlns = manifest.getAttribute("xmlns") || "";
  if (xmlns.includes("2004")) return "2004";

  // Check schemaversion element
  const schemaVersion =
    doc.querySelector("schemaversion")?.textContent?.trim() || "";
  if (schemaVersion.includes("2004") || schemaVersion === "CAM 1.3")
    return "2004";
  if (schemaVersion === "1.2" || schemaVersion.includes("1.2")) return "1.2";

  // Check metadata schema
  const schema = doc.querySelector("metadata > schema")?.textContent || "";
  if (schema.includes("2004")) return "2004";

  // Check for adlseq namespace (SCORM 2004 Sequencing)
  const attrs = manifest.attributes;
  for (let i = 0; i < attrs.length; i++) {
    if (attrs[i].value.includes("adlseq") || attrs[i].value.includes("imsss"))
      return "2004";
  }

  return "1.2";
}

function extractItems(
  parentEl: Element,
  resourceMap: Map<string, { href: string; type: string }>,
  scos: ParsedSco[],
  depth: number,
): void {
  const items = parentEl.querySelectorAll(":scope > item");
  items.forEach((item, idx) => {
    const identifier = item.getAttribute("identifier") || `item_${scos.length}`;
    const identifierref = item.getAttribute("identifierref") || "";
    const parameters = item.getAttribute("parameters") || undefined;
    const title =
      item.querySelector(":scope > title")?.textContent || identifier;

    if (identifierref && resourceMap.has(identifierref)) {
      const resource = resourceMap.get(identifierref)!;
      if (resource.href) {
        scos.push({
          identifier,
          title,
          launchPath: resource.href,
          parameters,
          orderIndex: scos.length,
          scormType: resource.type === "asset" ? "asset" : "sco",
        });
      }
    }

    // Recurse into nested items
    extractItems(item, resourceMap, scos, depth + 1);
  });
}

/**
 * Priority entry files for common SCORM authoring tools.
 */
export const PRIORITY_ENTRY_FILES = [
  "story.html",           // Articulate Storyline
  "index_lms.html",       // Articulate Storyline
  "index_lms_html5.html", // Articulate Storyline HTML5
  "story_html5.html",     // Articulate Storyline HTML5
  "index.html",           // Generic / Rise / Captivate
  "player.html",          // iSpring
  "launch.html",          // Various
];

/**
 * Determine the best entry file from a manifest or file listing.
 */
export function getBestEntryFile(manifest: ParsedManifest | null, availableFiles?: string[]): string | null {
  // First try manifest SCOs
  if (manifest && manifest.scos.length > 0) {
    return manifest.scos[0].launchPath;
  }

  // Fallback to priority file detection
  if (availableFiles) {
    for (const pf of PRIORITY_ENTRY_FILES) {
      if (availableFiles.includes(pf)) return pf;
    }
  }

  return null;
}
