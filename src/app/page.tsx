
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function Home() {
  return (
    <div>
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline">Open Dialog</Button>
        </DialogTrigger>
        <DialogContent>
           <DialogTitle>My Dialog Title</DialogTitle>
          <p>Hello from dialog!</p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
