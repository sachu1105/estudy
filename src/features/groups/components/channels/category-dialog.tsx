"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input, Label } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";

import {
  createCategoryAction,
  renameCategoryAction,
} from "../../channel-actions";

/** Add a category, or rename one. */
export function CategoryDialog({
  groupId,
  category,
  open,
  onOpenChange,
}: {
  groupId: string;
  /** Renaming this one; left out, a new category. */
  category?: { id: string; name: string };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(category?.name ?? "");
  const [pending, start] = useTransition();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const result = category
                ? await renameCategoryAction({
                    groupId,
                    categoryId: category.id,
                    name,
                  })
                : await createCategoryAction({ groupId, name });
              if (!result.ok) return void toast.error(result.error);
              toast.success(category ? "Category renamed" : "Category added");
              onOpenChange(false);
              if (!category) setName("");
              router.refresh();
            });
          }}
        >
          <DialogHeader>
            <DialogTitle>
              {category ? "Rename category" : "Add a category"}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="category-name">Name</Label>
            <Input
              id="category-name"
              value={name}
              maxLength={40}
              placeholder="Subjects"
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              type="submit"
              variant="primary"
              disabled={pending || !name.trim()}
            >
              {category ? "Save" : "Add category"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
