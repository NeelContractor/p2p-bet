import PusherServer from "pusher"
import PusherClient from "pusher-js"

console.log(process.env.PUSHER_APP_ID);
console.log(process.env.PUSHER_APP_KEY);
console.log(process.env.PUSHER_APP_SECRET);
console.log(process.env.PUSHER_APP_CLUSTER);
console.log(process.env.NEXT_PUBLIC_PUSHER_APP_KEY);

export const pusherServer = new PusherServer({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_APP_KEY!,
  secret: process.env.PUSHER_APP_SECRET!,
  cluster: process.env.PUSHER_APP_CLUSTER!,
  useTLS: true
});

export const pusherClient = new PusherClient(process.env.NEXT_PUBLIC_PUSHER_APP_KEY!, {
    cluster: 'mt1',
})