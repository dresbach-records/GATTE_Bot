
import { Conversation, User } from '@/types';

// Define a assinatura de cada passo dentro de um fluxo
export type FlowStep = (
    conv: Conversation,
    user: User,
    message: string
) => Promise<{ endFlow?: boolean } | void>;

// Classe abstrata que todo fluxo deve estender
export abstract class Flow {
    // Um registro de todos os passos que o fluxo pode executar
    abstract steps: Record<string, FlowStep>;

    // Retorna a função correspondente a um passo pelo nome
    getStep(stepName: string): FlowStep {
        return this.steps[stepName];
    }
}
