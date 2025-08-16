-- CreateTable
CREATE TABLE "public"."User" (
    "id" SERIAL NOT NULL,
    "walletPublicKey" TEXT,
    "username" TEXT,
    "imageUrl" TEXT,
    "betAmount" TEXT,
    "friendList" TEXT[],

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Message" (
    "id" SERIAL NOT NULL,
    "content" TEXT,
    "senderId" INTEGER,
    "timestamp" TEXT,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ChatMessage" (
    "id" SERIAL NOT NULL,
    "content" TEXT,
    "sender" TEXT,
    "senderId" TEXT,
    "chatId" TEXT,
    "timestamp" TEXT,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
