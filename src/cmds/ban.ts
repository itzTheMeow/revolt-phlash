import { Permissions } from "revkit";
import Command from "../Command";

export default new Command(
  "ban",
  {
    description: "Bans a member from the server.",
    permissions: [Permissions.BanMembers],
  },
  async (bot, message, args) => {
    if(!message.server || !message.member) return;
    
    const memberID = args.string(1);
    if(!memberID) return message.reply("Specify a member to ban!");
    
    const member = await message.server.members.fetch(memberID).catch(()=>null),
      user = await bot.users.fetch(member?.id || memberID).catch(()=>null);
      
    if(member?.id == bot.user.id) return message.reply("You want me to ban myself? How sad.");
    
    if(member && !member.bannable) return message.reply("I can't ban this member.");
    
    if(member && !member.inferiorTo(message.member)) return message.reply("You are not high enough to ban this member.");
    
    try { 
      await message.server.members.ban(member || memberID, {});
      message.channel.send(`Successfully banned ${user?.username || "user"}.`);
    } catch(err) {
      console.log(err);
    }
  }
);
