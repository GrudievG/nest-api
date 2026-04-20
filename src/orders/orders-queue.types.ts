export type OrdersProcessMessage = {
  messageId: string;
  orderId: string;
  attempt: number;
  simulate?: 'alwaysFail';
  failReason?: string;
};
