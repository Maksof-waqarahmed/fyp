import { Button } from '@/components/ui/button'
import { Card, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import React from 'react'

const Page = () => {
    return (
        <div>

            <Card className="mt-4 p-3 px-6 rounded-sm gap-2 shadow-sm border bg-white">
                <CardTitle className="mb-2 text-lg font-semibold">
                    Filter
                </CardTitle>

                <div className="flex flex-col lg:flex-row gap-4 items-end">

                    {/* Project Name */}
                    <div className="flex flex-col w-full ">
                        <label className="text-sm font-medium mb-1 text-muted-foreground">
                            Project Name
                        </label>
                        <Input
                            type="text"
                            placeholder="Search by project name..."
                        />
                    </div>

                    {/* From Date */}
                    <div className="flex flex-col w-full ">
                        <label className="text-sm font-medium mb-1 text-muted-foreground">
                            From Date
                        </label>
                        <Input type="date" />
                    </div>

                    {/* To Date */}
                    <div className="flex flex-col w-full ">
                        <label className="text-sm font-medium mb-1 text-muted-foreground">
                            To Date
                        </label>
                        <Input type="date" />
                    </div>
                </div>
                {/* Buttons */}
                <div className="flex justify-end mt-3">
                    <div className="flex gap-3">
                        <Button className="cursor-pointer">
                            Apply
                        </Button>
                        <Button variant="outline" className="cursor-pointer">
                            Reset
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    )
}

export default Page