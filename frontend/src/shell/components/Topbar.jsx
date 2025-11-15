import React from "react";
import { useSelector } from "react-redux";
import {
  AppBar,
  Toolbar,
  IconButton,
  Avatar,
  Typography,
  Stack,
  Tooltip,
  Badge,
  useTheme,
  useMediaQuery,
  Box,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import NotificationsNoneRoundedIcon from "@mui/icons-material/NotificationsNoneRounded";

export default function Topbar({ onMenuClick }) {
  const { user } = useSelector((s) => s.auth);
  const initial = (user?.name?.[0] || user?.email?.[0] || "U").toUpperCase();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("lg"));

  return (
    <AppBar
      position="sticky"
      color="inherit"
      sx={{
        zIndex: (th) => th.zIndex.drawer + 1,
        backgroundColor: theme.palette.background.paper,
        boxShadow: "0 2px 16px rgba(15,23,42,0.04)",
        borderBottom: `1px solid ${alpha(theme.palette.divider, 0.9)}`,
      }}
    >
      <Toolbar
        sx={{
          px: { xs: 1.5, sm: 2.5, lg: 3 },
          minHeight: 58,
        }}
      >
        {!isDesktop ? (
          <IconButton
            color="inherit"
            edge="start"
            onClick={onMenuClick}
            size="small"
            sx={{
              mr: 1.75,
              borderRadius: 1.5,
              border: `1px solid ${alpha(theme.palette.primary.main, 0.18)}`,
              backgroundColor: alpha(theme.palette.primary.main, 0.02),
              "&:hover": {
                backgroundColor: alpha(theme.palette.primary.main, 0.06),
              },
            }}
          >
            <MenuRoundedIcon fontSize="small" />
          </IconButton>
        ) : (
          <Box sx={{ width: 8 }} />
        )}

        {/* left spacer can be used later for breadcrumbs / page title */}
        <Box sx={{ flexGrow: 1 }} />

        <Stack direction="row" spacing={1.75} alignItems="center">
          <Tooltip title="Notifications">
            <IconButton
              size="small"
              sx={{
                borderRadius: 1.5,
                border: `1px solid ${alpha(theme.palette.primary.main, 0.18)}`,
                backgroundColor: alpha(theme.palette.primary.main, 0.02),
                color: alpha(theme.palette.text.primary, 0.9),
                "&:hover": {
                  backgroundColor: alpha(theme.palette.primary.main, 0.08),
                  color: theme.palette.primary.main,
                },
              }}
            >
              <Badge color="secondary" variant="dot" overlap="circular">
                <NotificationsNoneRoundedIcon fontSize="small" />
              </Badge>
            </IconButton>
          </Tooltip>

          <Stack direction="row" spacing={1.25} alignItems="center">
            <Tooltip title={user?.name || user?.email || "User"}>
              <Avatar
                sx={{
                  bgcolor: alpha(theme.palette.primary.main, 0.06),
                  color: theme.palette.primary.main,
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.24)}`,
                  width: 36,
                  height: 36,
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  boxShadow: "0 0 0 1px rgba(255,255,255,0.8)",
                }}
              >
                {initial}
              </Avatar>
            </Tooltip>

            {isDesktop && (
              <Box>
                <Typography
                  variant="subtitle2"
                  sx={{
                    fontWeight: 500,
                    lineHeight: 1.2,
                    color: theme.palette.text.primary,
                  }}
                >
                  {user?.name || user?.email || "Welcome"}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    color: alpha(theme.palette.text.primary, 0.6),
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                  }}
                >
                  {user?.role || "User"}
                </Typography>
              </Box>
            )}
          </Stack>
        </Stack>
      </Toolbar>
    </AppBar>
  );
}
