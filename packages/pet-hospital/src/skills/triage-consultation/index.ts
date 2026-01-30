export interface TriageContext {
  petId: string;
  userId: string;
  petType: string;
  collectedSymptoms: string[];
  duration?: string;
  severity?: 'mild' | 'moderate' | 'severe';
}

export interface TriageResponse {
  message: string;
  nextStep: string;
  collectedSymptoms?: string[];
  suggestedQuestions?: string[];
  recommendation?: 'OTC' | 'APPOINTMENT' | 'URGENT';
  requiresDoctor?: boolean;
}

export class TriageSkill {
  async startTriage(params: { petId: string; petType: string; userId: string }): Promise<TriageResponse> {
    return {
      message: `你好！我是 PetAI 健康助手 🐾 请问你的${params.petType === 'cat' ? '猫咪' : '狗狗'}有什么不舒服吗？`,
      nextStep: 'collect_symptoms',
      suggestedQuestions: [
        '呕吐或腹泻？',
        '食欲或饮水异常？',
        '精神状态如何？',
      ],
    };
  }

  async processSymptom(params: { petId: string; userId: string; symptoms: string[] }): Promise<TriageResponse> {
    return {
      message: `收到，你提到${params.symptoms.join('、')}。请告诉我更多情况：`,
      nextStep: 'collect_duration',
      collectedSymptoms: params.symptoms,
      suggestedQuestions: [
        '这种情况持续多久了？',
        '有没有其他症状？',
      ],
    };
  }

  async generateRecommendation(params: {
    petId: string;
    userId: string;
    symptoms: string[];
    duration: string;
    severity: 'mild' | 'moderate' | 'severe';
  }): Promise<TriageResponse> {
    const isMild = params.severity === 'mild' && params.symptoms.length <= 2;

    if (isMild) {
      return {
        message: `根据描述，可能是轻微肠胃问题。建议：先禁食4-6小时观察，可喂益生菌。`,
        nextStep: 'complete',
        collectedSymptoms: params.symptoms,
        recommendation: 'OTC',
        requiresDoctor: false,
      };
    }

    return {
      message: `情况需要医生进一步检查。建议尽快带${params.symptoms.join('、')}的情况就医。`,
      nextStep: 'transfer_to_doctor',
      collectedSymptoms: params.symptoms,
      recommendation: params.severity === 'severe' ? 'URGENT' : 'APPOINTMENT',
      requiresDoctor: true,
    };
  }
}
