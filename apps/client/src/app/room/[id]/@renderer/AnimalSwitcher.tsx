'use client';
import { useSpaceStore } from '@/store/useSpaceStore';
import type { AnimalType } from './animals/types';

const ANIMAL_LABELS: Record<AnimalType, string> = {
  rabbit: '🐰 토끼',
  dog: '🐶 강아지',
  cat: '🐱 고양이',
  bear: '🐻 곰',
  hamster: '🐹 햄스터',
};

export default function AnimalSwitcher() {
  const currentAnimal = useSpaceStore(state => state.currentAnimal);
  const setCurrentAnimal = useSpaceStore(state => state.setCurrentAnimal);

  const animals = Object.keys(ANIMAL_LABELS) as AnimalType[];

  return (
    <div className="flex gap-2 p-4 justify-center">
      {animals.map(animal => (
        <button
          key={animal}
          onClick={() => setCurrentAnimal(animal)}
          className={`px-3 py-1 rounded-md text-sm font-medium transition ${
            currentAnimal === animal
              ? 'bg-slate-700 text-white'
              : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
          }`}
        >
          {ANIMAL_LABELS[animal]}
        </button>
      ))}
    </div>
  );
}
