import { ClassificationResult, SemanticLabel } from "./ScoreTypes";

export interface ISemanticClassificationService {
  classifyReply(
    replyId: string,
    replyContent: string,
    parentContent?: string | null
  ): Promise<ClassificationResult>;
}

export class DummySemanticClassificationService
  implements ISemanticClassificationService
{
  async classifyReply(
    replyId: string,
    _replyContent: string,
    _parentContent?: string | null
  ): Promise<ClassificationResult> {
    const label: SemanticLabel =
      Math.random() < 0.5 ? "supportive" : "contradictory";
    return { label, confidence: 0.5, source: "dummy-random" };
  }
}
