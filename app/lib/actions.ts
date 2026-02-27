'use server';

import { z } from 'zod';
import postgres from 'postgres';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';


const sql = postgres(process.env.DATABASE_URL!, { ssl: 'require' });

const InvoiceFormSchema = z.object({
    id: z.string(),
    customerId: z.string(),
    amount: z
        .coerce.number()
        .min(0, { message: 'Amount must be positive' })
        .transform((value) => Math.round(value * 100)),
    status: z.enum(['pending', 'paid']),
    date: z.string(),
});

const CreateInvoice = InvoiceFormSchema.omit({ id: true, date: true });
export async function createInvoice(formData: FormData) {
    const { customerId, amount, status } = CreateInvoice.parse({
        customerId: formData.get('customerId'),
        amount: formData.get('amount'),
        status: formData.get('status'),
    });
    const date = new Date().toISOString().split('T')[0];

    try {
    await sql`
        INSERT INTO invoices (customer_id, amount, status, date)
        VALUES (${customerId}, ${amount}, ${status}, ${date})
    `;
    } catch (error) {
        // We'll also log the error to the console for now
        console.error(error);
        return {
            message: 'Database Error: Failed to Create Invoice.',
        };
    }

    // Once the database has been updated, the /dashboard/invoices path will be revalidated, and fresh data will be fetched from the server.
    revalidatePath('/dashboard/invoices');
    redirect('/dashboard/invoices');
}


// Use Zod to update the expected types
const UpdateInvoice = InvoiceFormSchema.omit({ id: true, date: true });


export async function updateInvoice(id: string, formData: FormData) {
    const { customerId, amount, status } = UpdateInvoice.parse({
        customerId: formData.get('customerId'),
        amount: formData.get('amount'),
        status: formData.get('status'),
    });

    try {
    await sql`
    UPDATE invoices
    SET customer_id = ${customerId}, amount = ${amount}, status = ${status}
    WHERE id = ${id}
  `;
    } catch (error) {
        // We'll also log the error to the console for now
        console.error(error);
        return { message: 'Database Error: Failed to Update Invoice.' };
    }

    revalidatePath('/dashboard/invoices');
    redirect('/dashboard/invoices');
}

export async function deleteInvoice(id: string) {
    throw new Error('Failed to Delete Invoice');
    try {
    await sql`
        DELETE FROM invoices WHERE id = ${id}
    `;
    } catch (error) {
        // We'll also log the error to the console for now
        console.error(error);
        return { message: 'Database Error: Failed to Delete Invoice.' };
    }
    revalidatePath('/dashboard/invoices');
}