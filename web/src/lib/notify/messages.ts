import { formatMoney } from "../money";

export type NotifyEvent = "CREATED" | "RECEIPT_REJECTED" | "PAYMENT_CONFIRMED" | "DELIVERED" | "CANCELLED" | "EXPIRED" | "REFUNDED";

export type OrderInfo = {
  ref: string;
  totalToPay: string;
  fromCurrency: string;
  receiveAmount: string;
  toCurrency: string;
  recipientName: string;
  payBy: Date;
  note?: string | null;
};

const time = (d: Date, locale: string) =>
  d.toLocaleTimeString(locale === "ru" ? "ru-RU" : "en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Moscow" }) + " MSK";

/** Plain-text message for the customer. The link opens the order page. */
export function customerMessage(event: NotifyEvent, o: OrderInfo, locale: string, link: string): string {
  const pay = formatMoney(o.totalToPay, o.fromCurrency, locale);
  const get = formatMoney(o.receiveAmount, o.toCurrency, locale);
  const ru = locale === "ru";
  const lines: Record<NotifyEvent, string> = {
    CREATED: ru
      ? `Заказ ${o.ref} создан. Переведите ${pay} до ${time(o.payBy, locale)} и загрузите чек.`
      : `Order ${o.ref} created. Pay ${pay} before ${time(o.payBy, locale)} and upload the receipt.`,
    RECEIPT_REJECTED: ru
      ? `Чек по заказу ${o.ref} не принят${o.note ? `: ${o.note}` : ""}. Загрузите правильный чек.`
      : `The receipt for ${o.ref} was not accepted${o.note ? `: ${o.note}` : ""}. Please upload the correct receipt.`,
    PAYMENT_CONFIRMED: ru
      ? `Оплата по заказу ${o.ref} получена. Отправляем ${get} получателю ${o.recipientName}.`
      : `Payment for ${o.ref} received. We are sending ${get} to ${o.recipientName}.`,
    DELIVERED: ru
      ? `✅ Доставлено! ${o.recipientName} получил(а) ${get}. Заказ ${o.ref}.`
      : `✅ Delivered! ${o.recipientName} received ${get}. Order ${o.ref}.`,
    CANCELLED: ru ? `Заказ ${o.ref} отменён.${o.note ? ` ${o.note}` : ""}` : `Order ${o.ref} was cancelled.${o.note ? ` ${o.note}` : ""}`,
    EXPIRED: ru
      ? `Время оплаты заказа ${o.ref} истекло. Если вы уже оплатили, напишите нам.`
      : `Time to pay order ${o.ref} has passed. If you already paid, write to us.`,
    REFUNDED: ru ? `Деньги по заказу ${o.ref} возвращены вам.` : `The money for order ${o.ref} was refunded to you.`,
  };
  return `${lines[event]}\n${link}`;
}

export function telegramWelcome(locale: string, name: string) {
  return locale === "ru"
    ? `Здравствуйте, ${name}! Теперь вы будете получать сюда обновления по своим переводам.`
    : `Hello ${name}! You will now get updates about your transfers here.`;
}
