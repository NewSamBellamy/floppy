const DEFINITIONS = {
  Idea: {
    objective: 'Clarify what is actually being proposed and what remains ambiguous.',
    focus: 'Clarify ambiguity, identify the proposed product and intended outcome, find analogous products or workflows, and separate explicit details from unresolved interpretation.',
    requiredReturnOutput: [
      'A concise, plain-language statement of the proposed product and intended outcome.',
      'Which parts of the idea are explicit, and which parts have multiple plausible interpretations.',
      'Relevant analogous products or workflows, with exact source names and links.',
      'The need or problem this idea appears to address, clearly labeled as evidence or inference.',
      'What remains unclear and the few questions that would resolve it.',
      'A notable distinction between the idea and the closest analogs, if supported.',
      'Exact source names and links for every external claim.',
    ],
  },
  Problem: {
    objective: 'Determine whether the described human problem exists, who experiences it, and how consequential it is.',
    focus: 'Test whether the problem exists, who experiences it, how often and how severely, where current workflows fail, which alternatives people use, and what evidence contradicts the hypothesis.',
    requiredReturnOutput: [
      'A concise problem statement or definition, separate from the proposed solution.',
      'Who experiences it, in what situation, and any supported frequency or severity.',
      'The strongest supporting evidence, tied to its exact source.',
      'Contradictory evidence, counterexamples, or reasons the problem may be overstated.',
      'Current workflows, alternatives, and where they fail or impose a cost.',
      'Unresolved questions and what evidence could falsify the problem hypothesis.',
      'Exact source names and links for every returned claim.',
    ],
  },
  Audience: {
    objective: 'Identify the people most affected by the confirmed problem and the context that shapes their needs.',
    focus: 'Compare likely user groups by strongest pain, workflow context, technical sophistication, constraints, segmentation, and who is most affected by the confirmed problem.',
    requiredReturnOutput: [
      'Likely user groups and the situation in which each experiences the problem.',
      'The strongest pain or unmet need for each plausible group.',
      'Workflow context, tools, constraints, and relevant triggers.',
      'Supported indicators of technical sophistication or access constraints; label gaps.',
      'A reasoned segmentation and which group appears most affected.',
      'Contradictions, uncertainties, and what could change the audience boundary.',
      'Exact source names and links for every returned claim.',
    ],
  },
  Alternatives: {
    objective: 'Map how people handle the problem today and why those behaviors persist.',
    focus: 'Find current tools, manual workarounds, substitutes, competitors, reasons people stay with current behavior, and weaknesses or gaps in existing approaches.',
    requiredReturnOutput: [
      'Current tools and products people use for this job.',
      'Manual workarounds, substitutes, and cases where people tolerate the problem.',
      'Relevant competitors or adjacent approaches, with a brief evidence-backed description.',
      'Why users continue with each current behavior despite its drawbacks.',
      'Weaknesses, trade-offs, and unmet needs in existing approaches.',
      'A concise comparison and the most important remaining uncertainties.',
      'Exact source names and links for every returned claim.',
    ],
  },
  Evidence: {
    objective: 'Separate what the current sources establish from claims that remain assumptions.',
    focus: 'Inventory evidence, connect sources to claims, identify unsupported assumptions, expose contradictions and bias, and determine which sources would materially improve confidence.',
    requiredReturnOutput: [
      'A list of the important project claims being assessed.',
      'For each claim, the exact source evidence that supports it or a note that support is missing.',
      'Which statements are observations, reported evidence, interpretation, or assumption.',
      'Contradictions, limitations, and potential source or sampling bias.',
      'The most important missing evidence and where it could be obtained.',
      'Which next source or observation would most change a project decision, and why.',
      'Exact source names and links, including dates or methods where available.',
    ],
  },
  Assumptions: {
    objective: 'Identify the assumptions most likely to change the project direction and how to test them.',
    focus: 'List key assumptions, rank the riskiest assumption, define what would falsify it, and propose low-cost validation methods with observable evidence.',
    requiredReturnOutput: [
      'The key assumptions required for the current idea and workflow to work.',
      'The riskiest assumption and the evidence-based reason it is most consequential.',
      'A falsifiable prediction or observation for each high-priority assumption.',
      'A practical validation method, participant or source, and what to observe.',
      'What result would support the assumption and what result would disprove it.',
      'Dependencies, ethical or access constraints, and unresolved test-design questions.',
      'Exact source names and links for evidence used to prioritize assumptions.',
    ],
  },
  'First Product': {
    objective: 'Find the smallest useful workflow that delivers a real user outcome.',
    focus: 'Define the smallest value-delivering experience, identify the moment value appears, determine what can be excluded, and compare relevant MVP patterns without presuming a technical medium.',
    requiredReturnOutput: [
      'The smallest complete user workflow that can deliver the intended value.',
      'The moment the user receives a useful, observable outcome.',
      'Capabilities that are essential for that first workflow and why.',
      'Explicit exclusions that can wait without breaking the value proposition.',
      'Relevant comparable MVP patterns and what can reasonably be learned from them.',
      'Dependencies, risks, and unknowns that could make this scope too small or too large.',
      'Exact source names and links for comparable examples or supporting evidence.',
    ],
  },
  Product: {
    objective: 'Check whether the proposed solution model coherently connects the confirmed problem to user value.',
    focus: 'Examine solution-model gaps, workflow coherence, fit between the confirmed problem and proposed product, and unresolved product questions.',
    requiredReturnOutput: [
      'A concise description of the product model and intended user outcome.',
      'How the proposed workflow addresses the confirmed problem, step by step.',
      'Where the solution appears to fit the problem and where fit is unsupported.',
      'Gaps, contradictions, or missing steps in the product model.',
      'Important alternatives in how the product could deliver the same outcome.',
      'The unresolved product questions most likely to change the direction.',
      'Exact source names and links for any precedent or evidence used.',
    ],
  },
  Features: {
    objective: 'Separate essential capabilities from dependencies, duplication, and later scope.',
    focus: 'Identify essential capabilities, their dependencies, MVP versus later scope, feature overlap, and features that do not support the core workflow.',
    requiredReturnOutput: [
      'Essential capabilities mapped to the user workflow and outcome they enable.',
      'Dependencies and the order in which capabilities are needed.',
      'A clear MVP-now versus later-versus-exclude grouping.',
      'Overlapping or redundant capabilities and how they could be simplified.',
      'Features that appear unnecessary or unsupported by the confirmed problem.',
      'Risks and assumptions that could change feature priority.',
      'Exact source names and links for evidence or comparable feature patterns.',
    ],
  },
  Identity: {
    objective: 'Explore a differentiated naming and brand territory that fits the product and its intended audience.',
    focus: 'Investigate naming territory, category and domain conflicts, positioning references, brand territory, and credible differentiation without implying legal clearance.',
    requiredReturnOutput: [
      'Several distinct naming territories connected to the product and user need.',
      'Positioning references and how neighboring products describe themselves.',
      'Potential category, name, or domain conflicts found in the reviewed sources.',
      'A differentiated brand territory with the associations it should and should not signal.',
      'Ways the identity could express the product’s value without copying a reference.',
      'Open questions and checks still needed; do not represent this as legal clearance.',
      'Exact source names and links for every conflict or positioning claim.',
    ],
  },
  Design: {
    objective: 'Find interaction and visual precedents that clarify how this product should feel and work.',
    focus: 'Research interaction references, UI patterns, platform conventions, accessibility needs, visual direction, and relevant product precedents.',
    requiredReturnOutput: [
      'Relevant interaction patterns and the user need each pattern serves.',
      'Platform conventions or constraints that affect the proposed experience.',
      'Accessibility considerations tied to concrete interface decisions.',
      'Visual directions and references, described by their useful qualities rather than copied wholesale.',
      'Relevant product precedents and what their examples do or do not establish.',
      'Unresolved design questions to answer before prototyping.',
      'Exact source names and links for each reference or convention.',
    ],
  },
  'Idea Brief': {
    objective: 'Check whether the collected project decisions form a coherent, supported brief.',
    focus: 'Find contradictions, missing sections, unsupported claims, and gaps that prevent the current project story from being coherent and decision-ready.',
    requiredReturnOutput: [
      'A concise outline of the project story already supported by confirmed decisions.',
      'Contradictions between confirmed chapters or attached evidence.',
      'Missing sections or definitions needed for a coherent brief.',
      'Claims that are unsupported, overstated, or confused with assumptions.',
      'The most consequential gap preventing a decision-ready brief.',
      'Specific questions or evidence that would close each important gap.',
      'Exact source names and links for evidence referenced in the review.',
    ],
  },
  Readiness: {
    objective: 'Identify what remains unproven or blocked before a responsible move into Prototype.',
    focus: 'Review unproven claims, blockers before Prototype, evidence gaps, unresolved risks, and whether the next learning step is clear.',
    requiredReturnOutput: [
      'The important claims that remain unproven before Prototype.',
      'Concrete blockers that should be resolved before building or testing.',
      'Evidence gaps and which project decision each gap affects.',
      'The most consequential unresolved risks and why they matter now.',
      'Work that can safely continue despite uncertainty.',
      'A concise recommended next learning step, with reasoning and caveats.',
      'Exact source names and links for claims used in the readiness review.',
    ],
  },
};

export function chapterInvestigationSpec(chapter) {
  const name = typeof chapter === 'string' ? chapter : chapter?.name;
  const definition = Object.hasOwn(DEFINITIONS, name) ? DEFINITIONS[name] : null;
  if (!definition) throw new RangeError(`Choose a valid Phase 1 chapter for investigation: ${String(name || 'unknown')}.`);
  return { chapterName: name, ...definition, requiredReturnOutput: [...definition.requiredReturnOutput] };
}

export function createInvestigation({ projectId, chapterKey, chapter, sourceIds = [], id, now = new Date().toISOString() } = {}) {
  const spec = chapterInvestigationSpec(chapter);
  return {
    id: id || globalThis.crypto?.randomUUID?.() || `investigation-${Date.now()}`,
    projectId: String(projectId || ''),
    chapterKey: String(chapterKey ?? ''),
    objective: spec.objective,
    brief: null,
    outputContract: [...spec.requiredReturnOutput],
    sourceIds: [...new Set(sourceIds.filter(value => typeof value === 'string' && value))],
    status: 'preparing',
    synthesis: null,
    createdAt: now,
    updatedAt: now,
  };
}
