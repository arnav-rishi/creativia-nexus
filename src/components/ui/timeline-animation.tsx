'use client'

import { motion, type Variants } from "framer-motion"
import { type RefObject } from "react"
import { cn } from "@/lib/utils"

interface TimelineContentProps {
  children: React.ReactNode
  animationNum: number
  timelineRef: RefObject<HTMLDivElement>
  customVariants?: Variants
  className?: string
  as?: "div" | "p" | "span" | "article" | "section"
}

export function TimelineContent({ 
  children, 
  animationNum, 
  timelineRef, 
  customVariants, 
  className, 
  as = "div" 
}: TimelineContentProps) {
  const defaultVariants: Variants = {
    hidden: {
      opacity: 0,
      y: 20,
      filter: "blur(10px)",
    },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: {
        delay: i * 0.15,
        duration: 0.5,
        ease: "easeOut",
      },
    }),
  }

  const variants = customVariants || defaultVariants

  const Component = as === "p" ? motion.p 
    : as === "span" ? motion.span 
    : as === "article" ? motion.article 
    : as === "section" ? motion.section 
    : motion.div

  return (
    <Component
      initial="hidden"
      animate="visible"
      custom={animationNum}
      variants={variants}
      className={cn(className)}
    >
      {children}
    </Component>
  )
}
