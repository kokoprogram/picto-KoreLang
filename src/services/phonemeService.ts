// Centralisation de la liste métier des phonèmes (PhonemeModel)
import { PhonemeModel } from '../types';

export const PHONEME_MODELS: PhonemeModel[] = [
  { id: 'p', symbol: 'p', name: 'Voiceless Bilabial Plosive', category: 'consonant', features: { place: 'bilabial', manner: 'plosive' } },
  { id: 'b', symbol: 'b', name: 'Voiced Bilabial Plosive', category: 'consonant', features: { place: 'bilabial', manner: 'plosive' } },
  { id: 't', symbol: 't', name: 'Voiceless Alveolar Plosive', category: 'consonant', features: { place: 'alveolar', manner: 'plosive' } },
  // ... Ajoutez tous les phonèmes nécessaires ici
];
