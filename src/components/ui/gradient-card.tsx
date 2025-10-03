import * as React from "react"
import { cn } from "@/lib/utils"

const GradientCard = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { gradient?: 'primary' | 'secondary' | 'accent' | 'warning' | 'success' | 'info' | 'none' }
>(({ className, gradient = 'none', ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-lg border bg-card text-card-foreground shadow-md transition-all duration-300 hover:shadow-xl",
      gradient === 'primary' && "bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/30",
      gradient === 'secondary' && "bg-gradient-to-br from-secondary/10 via-secondary/5 to-transparent border-secondary/30",
      gradient === 'accent' && "bg-gradient-to-br from-accent/10 via-accent/5 to-transparent border-accent/30",
      gradient === 'warning' && "bg-gradient-to-br from-warning/10 via-warning/5 to-transparent border-warning/30",
      gradient === 'success' && "bg-gradient-to-br from-success/10 via-success/5 to-transparent border-success/30",
      gradient === 'info' && "bg-gradient-to-br from-primary/10 via-secondary/5 to-transparent border-primary/20",
      className
    )}
    {...props}
  />
))
GradientCard.displayName = "GradientCard"

const GradientCardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
))
GradientCardHeader.displayName = "GradientCardHeader"

const GradientCardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-2xl font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
GradientCardTitle.displayName = "GradientCardTitle"

const GradientCardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
GradientCardDescription.displayName = "GradientCardDescription"

const GradientCardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
GradientCardContent.displayName = "GradientCardContent"

const GradientCardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
))
GradientCardFooter.displayName = "GradientCardFooter"

export { GradientCard, GradientCardHeader, GradientCardFooter, GradientCardTitle, GradientCardDescription, GradientCardContent }
