/* eslint-disable @typescript-eslint/no-unused-vars */

import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const { username, walletPublicKey, imageUrl } = await req.json();

        if (!username || !walletPublicKey) {
            return NextResponse.json({ error: 'Invalid Username/PublicKey' }, { status: 400 });
        }

        //check if username is laready taken
        const existingUser = await prisma.user.findFirst({
            where: { username }
        })

        if (existingUser) {
            return NextResponse.json({ error: "Username already taken" }, { status: 400 } );
        }

        const newUser = await prisma.user.create({
            data: {
                walletPublicKey: walletPublicKey!,
                username,
                imageUrl: imageUrl || "",
            }
        })

        return NextResponse.json({
            user: {
                username: newUser.username,
                walletPublicKey: newUser.walletPublicKey,
            }
        }, { status: 201 })
    } catch (err) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}