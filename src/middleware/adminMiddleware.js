export const adminOnly = (
  req,
  res,
  next
) => {
  if (
    !req.admin ||
    !["admin", "superadmin"].includes(
      req.admin.role
    )
  ) {
    return res.status(403).json({
      success: false,
      message:
        "Admin access required.",
    });
  }

  next();
};