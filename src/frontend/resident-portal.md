# Resident Portal - SmartCondo

## Visual Identity

Same design system as Admin portal (deep charcoal primary, cyan accent, Space Grotesk + Inter typography), but with distinct layout and workflow.

### Onboarding Flow
Residents enter through a simplified experience:

**Step 1: Identity Verification**
- Headline: "Xác thực tài khoản"
- Subheadline: "Vui lòng cung cấp thông tin để tiếp tục"
- Form: Email + Password fields
- Primary CTA: "Đăng nhập" (cyan background)

**Step 2: Onboarding Completion**
- If new resident: "Chào mừng đến với SmartCondo!"
- Subheadline: "Hãy thiết lập hồ sơ của bạn"
- Form: Apartment number, full name, relationship to owner
- Primary CTA: "Hoàn thành hồ sơ" (cyan background)

### Dashboard Overview
Residents see a simplified view of their own data:

**Key Stats (single column on mobile, two column on desktop):**
- Card 1: "Hóa đơn chưa trả" - with amount and due date
- Card 2: "Yêu cầu bảo trì của tôi" - count + link to list
- Card 3: "Thông báo mới" - count + mark as read

**NOT following AI defaults:**
- ❌ Not identical rounded cards with shadow
- ❌ Not template chrome with ALL-CAPS eyebrow labels
- ✅ Variable height cards, content-driven
- ✅ Plain verb button labels ("Hoàn thành" not "Submit")
- ✅ Specific empty state text, not "No data available"

### Navigation
- **Top navigation**: Brand left, user menu right
- **User menu**: Name, profile picture (placeholder), Log out
- **Mobile**: Hamburger menu that slides in from left
- **Bottom navigation** on mobile (only 3 items):
  1. Trang chủ
  2. Hóa đơn
  3. Bảo trì

### My Apartment Page
- Apartment details: Số căn hộ, Tầng, Diện tích
- Associated devices (if any)
- Associated vehicles (if any)
- Option to update information (if owner)

### Bills Page
- List of bills with: Loại, Hạn thanh toán, Trạng thái, Số tiền
- Filter by: Tháng, Loại hóa đơn
- Payment action: "Thanh toán" button (primary cyan)
- Download invoice link
- Empty state: "Chưa có hóa đơn" with CTA to view all

### Maintenance Requests Page
- Button: "Gửi yêu cầu bảo trì" (primary, full width)
- List of my requests with: Tiêu đề, Trạng thái, Ngày gửi, Hành động
- Quick update: Dropdown status change (Pending → In Progress → Completed)
- Empty state: "Chưa có yêu cầu bảo trì" with CTA "Gửi yêu cầu đầu tiên"

### Notifications Page
- List of notifications with: Tiêu đề, Ngày gửi, Đã đọc/Chưa đọc
- Mark as read inline
- Filter by: Tất cả, Chưa đọc, Đã đọc
- Empty state: "Chưa có thông báo"

### Empty States (per design system)
- **No bills**: Illustrative icon of money/coin
- **Headline**: "Chưa có hóa đơn"
- **CTA**: "Xem tất cả hóa đơn" (link)
- **Text**: "Hóa đơn sẽ hiển thị sau khi quản lý tòa nhà lập hóa đơn"

- **No maintenance requests**: Illustrative icon of wrench
- **Headline**: "Chưa có yêu cầu bảo trì"
- **CTA**: "Gửi yêu cầu bảo trì"
- **Text**: "Nếu có vấn đề với căn hộ, hãy gửi yêu cầu bảo trì"

### Error States
- **404**: "Trang không tìm thấy", "Bạn có thể quay về trang chủ"
- **Auth error**: "Sai thông tin đăng nhập", "Vui lòng thử lại"

### Motion
- **Page load**: Fade-in of main content (respecting reduced motion)
- **Row hover**: Subtle background tint
- **Button press**: Scale down 0.98, then back (not on reduced motion)
- **Form input focus**: Border color change to accent cyan

### Accessibility
- High contrast mode support
- Focus visible states
- Form labels always visible (not floating)
- Descriptive alt text on icons
- Skip link: "Bỏ qua nội dung chính"

### Color Usage (Resident Specific)
- Primary text: #1A1F2E
- Secondary text: #6B7280
- Positive: #22C55E (success, on bills: "Đã trả")
- Warning: #F2A95C (upcoming due date, unpaid)
- Action: #00B8D9 (cyan, primary buttons)
- Link: #00B8D9 (with underline on hover)

### Typography (Resident Specific)
- Same type scale as admin
- Form labels: Inter, 0.875rem, weight 500
- Button text: Inter, 0.875rem, weight 500, uppercase avoided
- Caption: Inter, 0.75rem, weight 500
- All caps avoided entirely (per design principles)

### Writing Guidelines (Resident Specific)
- "Thanh toán" not "Pay"
- "Gửi yêu cầu" not "Submit request"
- "Hóa đơn" not "Bill" (Vietnamese context)
- "Bảo trì" not "Maintenance" (Vietnamese context)
- Active voice throughout
- Conversational, plain language
- Each element does one job

### Responsive Behavior
- **Mobile < 640px**: Single column layout, bottom navigation, hamburger menu
- **Tablet 640-1024px**: Two column key stats, expanded navigation
- **Desktop > 1024px**: Full layout with sidebar-like top nav, all features available

### Payment Flow
1. View bill details
2. Click "Thanh toán" (primary cyan button)
3. Redirect to payment gateway (or mock payment page)
4. Success state: "Thanh toán thành công" toast
5. Error state: Specific error, "Thử lại" button

### Toast Notifications
- **Success**: "Thành công" + message, auto-dismiss after 3s
- **Error**: "Lỗi" + specific message, auto-dismiss after 5s
- **Info**: "Thông báo" + message, auto-dismiss after 4s
- Position: Top-right, not scattered across screen
- Respect reduced motion: No auto-dismiss animation (just instant appear/dismiss)