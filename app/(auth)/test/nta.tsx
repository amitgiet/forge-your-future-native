import React from 'react';
import { View } from 'react-native';
import NTATestPlayer, { NTAQuestion } from '@/components/NTATestPlayer';

const sampleQuestions: NTAQuestion[] = [
  {
    _id: 'q1',
    id: 'q1',
    questionId: 'q1',
    type: 'mcq',
    question: 'What is the capital of India?',
    explanation: 'New Delhi is the capital of India.',
    questionDiagramRefs: [],
    explanationDiagramRefs: [],
    resolvedQuestionDiagrams: [],
    resolvedExplanationDiagrams: [],
    typeData: { options: ['New Delhi', 'Mumbai', 'Kolkata', 'Chennai'] },
    isSupported: true,
    correctAnswer: 'New Delhi',
  },
  {
    _id: 'q2',
    id: 'q2',
    questionId: 'q2',
    type: 'mcq',
    question: 'Which gas is used for respiration?',
    explanation: 'Oxygen is used in respiration.',
    questionDiagramRefs: [],
    explanationDiagramRefs: [],
    resolvedQuestionDiagrams: [],
    resolvedExplanationDiagrams: [],
    typeData: { options: ['Oxygen', 'Nitrogen', 'Carbon dioxide', 'Hydrogen'] },
    isSupported: true,
    correctAnswer: 'Oxygen',
  },
];

const NTATestScreen = () => {
  const handleSubmit = (data: any) => {
    console.log('NTA submit', data);
  };

  return (
    <View style={{ flex: 1 }}>
      <NTATestPlayer
        questions={sampleQuestions}
        title="NTA Practice"
        duration={900}
        onSubmit={handleSubmit}
      />
    </View>
  );
};

export default NTATestScreen;
