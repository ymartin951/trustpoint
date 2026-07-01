import { motion, useMotionValue, useTransform } from "framer-motion";

type Props = {
  user: any;
  onSwipe: (direction: "left" | "right", user: any) => void;
};

export default function SwipeCard({ user, onSwipe }: Props) {
  const x = useMotionValue(0);

  const rotate = useTransform(x, [-200, 200], [-15, 15]);
  const opacity = useTransform(x, [-200, 0, 200], [0.5, 1, 0.5]);

  const handleDragEnd = (_: any, info: any) => {
    if (info.offset.x > 120) {
      onSwipe("right", user);
    } else if (info.offset.x < -120) {
      onSwipe("left", user);
    }
  };

  

  return (
    <motion.div
      className="absolute w-full max-w-sm h-[500px] bg-white rounded-2xl shadow-xl overflow-hidden"
      style={{ x, rotate, opacity }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
    >
      <img
        src={user.avatar_url || "/placeholder.png"}
        className="w-full h-full object-cover"
      />

      <div className="absolute bottom-0 bg-gradient-to-t from-black/70 to-transparent w-full p-4 text-white">
        <h2 className="text-xl font-bold">{user.full_name}</h2>
        <p>{user.city}, {user.country}</p>
      </div>
    </motion.div>

    
  );

  
}