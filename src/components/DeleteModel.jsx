import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogFooter,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogCancel,
    AlertDialogAction,
} from "@/components/ui/alert-dialog"

import { Loader2, Trash2 } from "lucide-react"

export function DeleteModel({
    title,
    description,
    open,
    onOpenChange,
    onDelete,
    loading,
}) {
    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent
                className="
            w-full max-w-sm!
            rounded-2xl!
            bg-[#f3f3f3]
            p-0!
            shadow-[0_10px_30px_rgba(0,0,0,0.15)]
            gap-0!
          "
            >
                {/* BODY */}
                <div className="p-4 text-center">
                    {/* Icon */}
                    <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-red-200/60">
                        <Trash2 className="h-6 w-6 text-red-600" />
                    </div>

                    <AlertDialogHeader className="space-y-3 text-center">
                        <AlertDialogTitle className="text-lg text-center font-semibold text-black">
                            {title}
                        </AlertDialogTitle>

                        <AlertDialogDescription className="text-sm text-center text-gray-600 leading-relaxed">
                            {description}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                </div>

                {/* Divider */}
                <div className="h-px bg-gray-300/60 my-0!" />

                {/* FOOTER */}
                <AlertDialogFooter className="mt-0! flex-row gap-4 px-6 py-4 bg-[#F9F9F9] rounded-b-2xl!">
                    <AlertDialogCancel
                        className="
                                    flex-1
                                    rounded-xl
                                    border
                                    border-gray-300
                                    bg-white
                                    text-black
                                    hover:bg-gray-100
                                    shadow-none!
                                "
                        disabled={loading}
                    >
                        Cancel
                    </AlertDialogCancel>

                    <AlertDialogAction
                        onClick={onDelete}
                        className="
                                    flex-1
                                    rounded-xl
                                    bg-red-200/70
                                    text-red-600
                                    hover:bg-red-200
                                    shadow-none
                                "
                        disabled={loading}
                    >
                        {loading ? "Deleting..." : "Delete"}
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}