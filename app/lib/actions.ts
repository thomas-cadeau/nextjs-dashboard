'use server';

import { z } from 'zod';
import postgres from 'postgres';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';


const sql = postgres(process.env.DATABASE_URL!, { ssl: 'require' });

const InvoiceFormSchema = z.object({
    id: z.string(),
    customerId: z.string({ invalid_type_error: 'Please select a customer' }).uuid({ message: 'Please select a customer' }),
    amount: z
        .coerce.number()
        .gt(0, { message: 'Amount must be positive' })
        .transform((value) => Math.round(value * 100)),
    status: z.enum(['pending', 'paid'], { invalid_type_error: 'Please select a status' }),
    date: z.string(),
});

export type InvoiceState = {
    errors?: {
        customerId?: string[];
        amount?: string[];
        status?: string[];
    };
    message?: string | null;
};

const CreateInvoice = InvoiceFormSchema.omit({ id: true, date: true });
export async function createInvoice(prevState: InvoiceState, formData: FormData) {

    // Extract form data for potential return on validation error
    const submittedData = {
        customerId: formData.get('customerId') as string,
        amount: formData.get('amount') as string,
        status: formData.get('status') as string,
    };

    const validatedFields = CreateInvoice.safeParse(submittedData);

    if (!validatedFields.success) {
        console.error("create form validation:", validatedFields.error.flatten().fieldErrors);
        return {
            ...prevState,
            errors: validatedFields.error.flatten().fieldErrors,
            message: 'Missing Fields. Failed to Create Invoice.',
        };
    }
    const { customerId, amount, status } = validatedFields.data;
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
            ...prevState,
            message: 'Database Error: Failed to Create Invoice.',
        };
    }

    // Once the database has been updated, the /dashboard/invoices path will be revalidated, and fresh data will be fetched from the server.
    revalidatePath('/dashboard/invoices');
    redirect('/dashboard/invoices');
}


// Use Zod to update the expected types
const UpdateInvoice = InvoiceFormSchema.omit({ id: true, date: true });


export async function updateInvoice(id: string, prevState: InvoiceState, formData: FormData) {
    const validatedFields = UpdateInvoice.safeParse({
        customerId: formData.get('customerId'),
        amount: formData.get('amount'),
        status: formData.get('status'),
    });

    if (!validatedFields.success) {
        console.error("update form validation:", validatedFields.error.flatten().fieldErrors);
        return {
            ...prevState,
            errors: validatedFields.error.flatten().fieldErrors,
            message: 'Missing Fields. Failed to Update Invoice.',
        };
    }

    const { customerId, amount, status } = validatedFields.data;

    try {
    await sql`
    UPDATE invoices
    SET customer_id = ${customerId}, amount = ${amount}, status = ${status}
    WHERE id = ${id}
  `;
    } catch (error) {
        // We'll also log the error to the console for now
        console.error(error);
        return {
            ...prevState,
            message: 'Database Error: Failed to Update Invoice.',
        };
    }

    revalidatePath('/dashboard/invoices');
    redirect('/dashboard/invoices');
}

export async function deleteInvoice(id: string) {
    try {
    await sql`
        DELETE FROM invoices WHERE id = ${id}
    `;
    } catch (error) {
        // We'll also log the error to the console for now
        console.error(error);
        throw new Error('Failed to Delete Invoice');
    }
    revalidatePath('/dashboard/invoices');
}