export const LabelError = ({ id, errors }: { id: string, errors?: string | string[] | null }) => {
    if (!errors || (Array.isArray(errors) && errors.length === 0)) {
        return null;
    }
    return (
        <div id={id} aria-live="polite" aria-atomic="true">
            {Array.isArray(errors) ? errors.map((error: string) => (
                <p className="mt-2 text-sm text-red-500" key={error}>
                    {error}
                </p>
            )) : (
                <p className="mt-2 text-sm text-red-500">
                    {errors}
                </p>
            )}
        </div>
    );
};