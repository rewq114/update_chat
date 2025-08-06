export interface Chat {
  id: string;
  name: string;
  messages: Message[];
}

// --- 데이터 타입 정의 ---
export interface Message {
  idx: number;
  text: string;
  role: string;
}