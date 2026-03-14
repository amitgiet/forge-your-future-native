import React from 'react';
import { View } from 'react-native';
import { NTATestPlayer, NTAQuestion } from '@/components/NTATestPlayer';

const sampleQuestions: NTAQuestion[] = [
  {
    _id: 'q1',
    question: 'What is the capital of India?',
    options: ['New Delhi', 'Mumbai', 'Kolkata', 'Chennai'],
    correctAnswer: 'New Delhi',
    explanation: 'New Delhi is the capital of India.',
  },
  {
    _id: 'q2',
    question: 'Which gas is used for respiration?',
    options: ['Oxygen', 'Nitrogen', 'Carbon dioxide', 'Hydrogen'],
    correctAnswer: 'Oxygen',
    explanation: 'Oxygen is used in respiration.',
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
