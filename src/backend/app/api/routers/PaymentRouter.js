// Rule 11: Standardize Routes
import express from 'express';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import config from '../../config/index.js';

const router = express.Router();
const supabase = createClient(config.supabase.url, config.supabase.serviceKey || config.supabase.key);

// POST /api/payments/webhook/lojou
router.post('/webhook/lojou', async (req, res) => {
    console.log('🔔 [LOJOU] Webhook Received:', new Date().toISOString());
    console.log('Payload:', JSON.stringify(req.body, null, 2));

    try {
        const payload = req.body;

        // 1. Verify Status
        if (payload.status !== 'paid') {
            console.log(`⚠️ [LOJOU] Payment status is ${payload.status} (ignored)`);
            return res.json({ received: true, status: 'ignored' });
        }

        // 2. Identify User
        const email = payload.customer?.email;
        const name = payload.customer?.name;
        const phone = payload.customer?.phone;
        const planName = payload.plan_subscriber?.plan_name || payload.product?.name;

        if (!email) {
            console.error('❌ [LOJOU] No email in payload');
            return res.status(200).json({ error: 'no_email' });
        }

        console.log(`👤 Processing for: ${email} (${planName})`);

        // 3. Find or Create User
        let { data: user } = await supabase.from('users').select('*').eq('email', email).single();
        let isNewUser = false;
        let password = null;

        if (!user) {
            console.log('🆕 Auto-creating account for', email);
            isNewUser = true;
            password = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
            const hashedPassword = await bcrypt.hash(password, 10);

            const newUser = {
                email,
                password_hash: hashedPassword,
                name: name || email.split('@')[0],
                phone: phone,
                credits: 0,
                plan: 'free',
                provider: 'email',
                created_at: new Date().toISOString()
            };

            const { data: created, error } = await supabase.from('users').insert(newUser).select().single();
            if (error) throw new Error(`User creation failed: ${error.message}`);
            user = created;
        }

        // 4. Determine Credits/Plan
        let creditsToAdd = 0;
        let newPlan = user.plan;

        if (planName && planName.toLowerCase().includes('premium')) {
            creditsToAdd = 1000;
            newPlan = 'premium';
        } else if (planName && planName.toLowerCase().includes('básico')) {
            creditsToAdd = 100;
            newPlan = 'basic';
        } else {
            creditsToAdd = 50;
        }

        // 5. Update User
        await supabase.from('users').update({
            credits: user.credits + creditsToAdd,
            plan: (newPlan !== 'free') ? newPlan : user.plan
        }).eq('id', user.id);

        console.log(`✅ Added ${creditsToAdd} credits to ${email}`);

        // 6. Send Email (Mock)
        if (isNewUser) {
            console.log(`📧 [EMAIL REQUIRED] Send to ${email}: PW=${password}`);
        } else {
            console.log(`📧 [EMAIL REQUIRED] Send credit/plan confirmation to ${email}`);
        }

        res.json({ received: true, action: isNewUser ? 'created_user' : 'updated_credits' });

    } catch (error) {
        console.error('❌ [LOJOU] Webhook Error:', error);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
});

export default router;
