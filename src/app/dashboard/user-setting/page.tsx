import { api } from "@/trpc/trpc-server/server"
import UserSetting from "./_components/user-setting"

const UserSettingPage = async () => {
    const { data: settingsData } = await api.userSetting.getSettingDetail()

    return (
        <>
            <UserSetting data={settingsData} />
        </>
    )
}

export default UserSettingPage
