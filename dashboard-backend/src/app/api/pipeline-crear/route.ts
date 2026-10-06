// src/app/api/pipeline-crear/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/mongooes';
import PipelineCrear from '@/modal/Pipelinecrear';
import { uploadImage, uploadFileClean as uploadFile } from '@/lib/cloudinary';

/* ─────────────────────────────────────────────────────────────────
   POST  /api/pipeline-crear
   Creates a new pipeline profile for the authenticated user.
   Accepts multipart/form-data so the client can attach:
     - avatar   (optional image)
     - resume   (optional PDF / DOCX)
     - all other fields as plain text values
────────────────────────────────────────────────────────────────── */
export async function POST(req: NextRequest) {
    try {
        /* 1. Auth -------------------------------------------------------- */
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const userId = (session.user as any).id || session.user.email;
        if (!userId) {
            return NextResponse.json({ error: 'Invalid user session' }, { status: 401 });
        }

        /* 2. DB ---------------------------------------------------------- */
        await connectToDatabase();

        // One profile per user
        const existing = await PipelineCrear.findOne({ userId });
        if (existing) {
            return NextResponse.json(
                { error: 'A pipeline profile already exists for this user. Use PATCH to update it.' },
                { status: 409 }
            );
        }

        /* 3. Parse FormData --------------------------------------------- */
        const formData = await req.formData();

        const firstName = formData.get('firstName') as string;
        const lastName = formData.get('lastName') as string;
        const email = formData.get('email') as string;
        const phone = formData.get('phone') as string | null;
        const location = formData.get('location') as string | null;
        const country = formData.get('country') as string | null;
        const linkedIn = formData.get('linkedIn') as string | null;
        const portfolio = formData.get('portfolio') as string | null;
        const title = formData.get('title') as string;
        const summary = formData.get('summary') as string | null;
        const isPublicRaw = formData.get('isPublic') as string | null;
        const educationRaw = formData.get('education') as string | null;
        const experienceRaw = formData.get('experience') as string | null;
        const skillsRaw = formData.get('skills') as string | null;
        const avatarFile = formData.get('avatar') as File | null;
        const resumeFile = formData.get('resume') as File | null;

        /* 4. Validate required fields ----------------------------------- */
        if (!firstName || !lastName || !email || !title) {
            return NextResponse.json(
                { error: 'Missing required fields: firstName, lastName, email, title' },
                { status: 400 }
            );
        }

        /* 5. Parse JSON arrays (education / experience / skills) -------- */
        let education = [];
        let experience = [];
        let skills = [];

        try {
            if (educationRaw) education = JSON.parse(educationRaw);
            if (experienceRaw) experience = JSON.parse(experienceRaw);
            if (skillsRaw) skills = JSON.parse(skillsRaw);
        } catch {
            return NextResponse.json(
                { error: 'education, experience, and skills must be valid JSON arrays' },
                { status: 400 }
            );
        }

        /* 6. Upload avatar to Cloudinary (image) ------------------------ */
        let avatarUrl: string | undefined;
        if (avatarFile && avatarFile.size > 0) {
            avatarUrl = await uploadImage(avatarFile, 'pipeline/avatars');
        }

        /* 7. Upload resume to Cloudinary (raw file) --------------------- */
        let resumeUrl: string | undefined;
        let resumePublicId: string | undefined;
        if (resumeFile && resumeFile.size > 0) {
            const uploaded = await uploadFile(resumeFile, 'pipeline/resumes', String(userId));
            resumeUrl = uploaded.secureUrl;
            resumePublicId = uploaded.publicId;
        }

        /* 8. Create document ------------------------------------------- */
        const profile = await PipelineCrear.create({
            userId,
            firstName,
            lastName,
            email,
            phone: phone || undefined,
            location: location || undefined,
            country: country || undefined,
            linkedIn: linkedIn || undefined,
            portfolio: portfolio || undefined,
            title,
            summary: summary || undefined,
            education,
            experience,
            skills,
            avatarUrl,
            resumeUrl,
            resumePublicId,
            isPublic: isPublicRaw === 'true',
            status: 'active',
            stage: 'applied',
        });

        try {
            const { sendPipelineCreationUserEmail, sendPipelineCreationAdminEmail } = await import('@/utils/email');

            // Notify the user
            await sendPipelineCreationUserEmail(
                email,
                firstName,
                lastName,
                title
            );

            // Notify the admin
            await sendPipelineCreationAdminEmail(
                `${firstName} ${lastName}`,
                email,
                title,
                String(profile._id)
            );
        } catch (emailError) {
            console.error('Failed to send pipeline creation emails:', emailError);
            // Do not fail the request; just log
        }


        return NextResponse.json({ success: true, id: profile._id }, { status: 201 });
    } catch (error) {
        console.error('[POST /api/pipeline-crear]', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

/* ─────────────────────────────────────────────────────────────────
   GET  /api/pipeline-crear
   Returns the authenticated user's pipeline profile.
────────────────────────────────────────────────────────────────── */
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const userId = (session.user as any).id || session.user.email;

        await connectToDatabase();

        const profile = await PipelineCrear.findOne({ userId }).lean();
        if (!profile) {
            return NextResponse.json({ error: 'No pipeline profile found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, data: profile }, { status: 200 });
    } catch (error) {
        console.error('[GET /api/pipeline-crear]', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

/* ─────────────────────────────────────────────────────────────────
   PATCH  /api/pipeline-crear
   Updates specific fields of the user's existing pipeline profile.
   Send only the fields you want to change (partial update).
────────────────────────────────────────────────────────────────── */
export async function PATCH(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const userId = (session.user as any).id || session.user.email;

        await connectToDatabase();

        const profile = await PipelineCrear.findOne({ userId });
        if (!profile) {
            return NextResponse.json({ error: 'No pipeline profile found' }, { status: 404 });
        }

        const formData = await req.formData();
        const updates: Record<string, any> = {};

        // Scalar fields
        const scalarFields = [
            'firstName', 'lastName', 'email', 'phone', 'location',
            'country', 'linkedIn', 'portfolio', 'title', 'summary',
            'stage', 'status',
        ] as const;

        for (const field of scalarFields) {
            const val = formData.get(field);
            if (val !== null) updates[field] = val as string;
        }

        if (formData.get('isPublic') !== null) {
            updates.isPublic = formData.get('isPublic') === 'true';
        }

        // JSON arrays
        for (const key of ['education', 'experience', 'skills'] as const) {
            const raw = formData.get(key) as string | null;
            if (raw) {
                try {
                    updates[key] = JSON.parse(raw);
                } catch {
                    return NextResponse.json({ error: `${key} must be a valid JSON array` }, { status: 400 });
                }
            }
        }

        // Replace avatar
        const avatarFile = formData.get('avatar') as File | null;
        if (avatarFile && avatarFile.size > 0) {
            updates.avatarUrl = await uploadImage(avatarFile, 'pipeline/avatars');
        }

        // Replace resume
        const resumeFile = formData.get('resume') as File | null;
        if (resumeFile && resumeFile.size > 0) {
            const uploaded = await uploadFile(resumeFile, 'pipeline/resumes', String(userId));
            updates.resumeUrl = uploaded.secureUrl;
            updates.resumePublicId = uploaded.publicId;
        }

        const updated = await PipelineCrear.findOneAndUpdate(
            { userId },
            { $set: updates },
            { new: true }
        ).lean();

        return NextResponse.json({ success: true, data: updated }, { status: 200 });
    } catch (error) {
        console.error('[PATCH /api/pipeline-crear]', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}