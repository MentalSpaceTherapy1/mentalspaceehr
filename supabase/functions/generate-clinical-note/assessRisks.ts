// Basic keyword-based risk assessment (fallback when AI unavailable)
export async function assessRisks(content: any, inputText: string): Promise<string[]> {
  const risks: string[] = [];
  const fullText = JSON.stringify(content) + " " + inputText;
  const lowerText = fullText.toLowerCase();

  // Simple keyword-based risk detection
  const riskPatterns = {
    suicidal_ideation: ["suicidal", "kill myself", "end my life", "want to die", "not worth living"],
    homicidal_ideation: ["kill someone", "hurt someone", "homicidal", "violent thoughts towards"],
    self_harm: ["cut myself", "self-harm", "self harm", "cutting"],
    substance_abuse: ["drinking heavily", "using drugs", "substance abuse", "addiction"],
    abuse_disclosure: ["being abused", "abuse at home", "hitting me", "sexual abuse"],
  };

  for (const [risk, patterns] of Object.entries(riskPatterns)) {
    if (patterns.some((pattern) => lowerText.includes(pattern))) {
      risks.push(risk);
    }
  }

  return risks;
}
