/**
 * ScormManifestParser — Client-side imsmanifest.xml parser.
 * Detects SCORM version, SCOs, resources, launch files,
 * and extended metadata (mastery score, launch data, time limits, completion threshold).
 * Inspired by eFront LMS SCORM implementation.
 */

export interface ParsedSco {
  identifier: string;
  title: string;
  launchPath: string;
  parameters?: string;
  orderIndex: number;
  scormType: "sco" | "asset";
  /** SCORM 1.2: adlcp:masteryscore */
  masteryScore?: number;
  /** SCORM 1.2: adlcp:maxtimeallowed (HHHH:MM:SS) */
  maxTimeAllowed?: string;
  /** SCORM 1.2: adlcp:timelimitaction */
  timeLimitAction?: string;
  /** SCORM 1.2/2004: adlcp:datafromlms */
  dataFromLms?: string;
  /** SCORM 2004: adlcp:completionThreshold minProgressMeasure */
  completionThreshold?: number;
  /** SCORM 2004: imsss:primaryObjective satisfiedByMeasure + minNormalizedMeasure */
  scaledPassingScore?: number;
  /** SCORM 2004: prerequisites string */
  prerequisites?: string;
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

    // Build resource map: identifier → href + type
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
      extractItems(doc, orgEl, resourceMap, scos, 0);
    }

    // If no SCOs found from items, try resources directly
    if (scos.length === 0) {
      let idx = 0;
      for (const [id, res] of resourceMap) {
        if (res.href && (res.href.endsWith(".html") || res.href.endsWith(".htm"))) {
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

/**
 * Get text content of a child element by local name, searching with namespace-agnostic approach.
 */
function getChildText(parent: Element, localName: string): string | null {
  // Try direct child first
  const direct = parent.querySelector(`:scope > ${localName}`);
  if (direct?.textContent) return direct.textContent.trim();

  // Try with common namespace prefixes (adlcp:, imsss:)
  for (const prefix of ["adlcp:", "imsss:", "adlseq:"]) {
    const el = Array.from(parent.children).find(
      (c) => c.tagName.toLowerCase() === `${prefix}${localName}`.toLowerCase() ||
             c.localName?.toLowerCase() === localName.toLowerCase()
    );
    if (el?.textContent) return el.textContent.trim();
  }

  // Namespace-agnostic: match by local name
  const el = Array.from(parent.children).find(
    (c) => c.localName?.toLowerCase() === localName.toLowerCase()
  );
  if (el?.textContent) return el.textContent.trim();

  return null;
}

/**
 * Get attribute from a child element by local name, namespace-agnostic.
 */
function getChildAttr(parent: Element, localName: string, attrName: string): string | null {
  const el = Array.from(parent.children).find(
    (c) => c.localName?.toLowerCase() === localName.toLowerCase()
  );
  if (!el) return null;
  return el.getAttribute(attrName) || el.getAttribute(attrName.toLowerCase()) || null;
}

function extractItems(
  doc: Document,
  parentEl: Element,
  resourceMap: Map<string, { href: string; type: string }>,
  scos: ParsedSco[],
  depth: number,
): void {
  const items = parentEl.querySelectorAll(":scope > item");
  items.forEach((item) => {
    const identifier = item.getAttribute("identifier") || `item_${scos.length}`;
    const identifierref = item.getAttribute("identifierref") || "";
    const parameters = item.getAttribute("parameters") || undefined;
    const title =
      item.querySelector(":scope > title")?.textContent || identifier;

    if (identifierref && resourceMap.has(identifierref)) {
      const resource = resourceMap.get(identifierref)!;
      if (resource.href) {
        const sco: ParsedSco = {
          identifier,
          title,
          launchPath: resource.href,
          parameters,
          orderIndex: scos.length,
          scormType: resource.type === "asset" ? "asset" : "sco",
        };

        // ── Extract extended SCORM metadata (eFront-compatible) ──

        // SCORM 1.2: adlcp:masteryscore
        const masteryStr = getChildText(item, "masteryscore");
        if (masteryStr) {
          const val = parseFloat(masteryStr);
          if (!isNaN(val)) sco.masteryScore = val;
        }

        // SCORM 1.2: adlcp:maxtimeallowed
        const maxTime = getChildText(item, "maxtimeallowed");
        if (maxTime) sco.maxTimeAllowed = maxTime;

        // SCORM 1.2: adlcp:timelimitaction
        const tla = getChildText(item, "timelimitaction");
        if (tla) sco.timeLimitAction = tla;

        // SCORM 1.2/2004: adlcp:datafromlms
        const dfl = getChildText(item, "datafromlms");
        if (dfl) sco.dataFromLms = dfl;

        // SCORM 1.2: adlcp:prerequisites
        const prereq = getChildText(item, "prerequisites");
        if (prereq) sco.prerequisites = prereq;

        // SCORM 2004: adlcp:completionThreshold
        const ctMinProgress = getChildAttr(item, "completionThreshold", "minProgressMeasure");
        if (ctMinProgress) {
          const val = parseFloat(ctMinProgress);
          if (!isNaN(val)) sco.completionThreshold = val;
        }

        // SCORM 2004: imsss:sequencing > imsss:primaryObjective > imsss:minNormalizedMeasure
        const seqEl = Array.from(item.children).find(
          (c) => c.localName?.toLowerCase() === "sequencing"
        );
        if (seqEl) {
          const objEl = Array.from(seqEl.children).find(
            (c) => c.localName?.toLowerCase() === "objectives"
          );
          if (objEl) {
            const primaryObj = Array.from(objEl.children).find(
              (c) => c.localName?.toLowerCase() === "primaryobjective"
            );
            if (primaryObj) {
              const minMeasure = getChildText(primaryObj, "minNormalizedMeasure");
              if (minMeasure) {
                const val = parseFloat(minMeasure);
                if (!isNaN(val)) sco.scaledPassingScore = val;
              }
            }
          }
        }

        scos.push(sco);
      }
    }

    // Recurse into nested items
    extractItems(doc, item, resourceMap, scos, depth + 1);
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
