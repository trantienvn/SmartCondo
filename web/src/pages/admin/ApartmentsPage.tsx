import React, { useState } from "react";
import { api } from "../../api";
import { ErrorBanner, EmptyState, LoadingLine, PageHeading, StatusTag } from "../../components/common";
import { useRemote } from "../../hooks/useRemote";
import type { Apartment, Building } from "../../types";

export function ApartmentsPage({
  canManage,
  notify,
}: {
  canManage: boolean;
  notify: (message: string) => void;
}) {
  const buildings = useRemote<Building[]>("/buildings", "buildings");
  const [selectedBuilding, setSelectedBuilding] = useState("");
  const blocks = useRemote<
    { id: string; code: string; name: string; floors: { id: string; floorNumber: number; name: string | null }[] }[]
  >(selectedBuilding ? `/buildings/${selectedBuilding}/blocks` : "", "blocks");
  const apartments = useRemote<Apartment[]>("/apartments", "apartments");
  const [mode, setMode] = useState<"block" | "floor" | "apartment">("apartment");
  const [message, setMessage] = useState("");
  const selectedUnits = (apartments.data ?? []).filter(
    (unit) => !selectedBuilding || unit.building_id === selectedBuilding
  );
  const flatFloors = (blocks.data ?? []).flatMap((block) => block.floors.map((floor) => ({ ...floor, block })));

  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    const form = new FormData(event.currentTarget);
    try {
      if (mode === "block") {
        await api(`/buildings/${selectedBuilding}/blocks`, {
          method: "POST",
          body: JSON.stringify({ code: form.get("code"), name: form.get("name") }),
        });
      }
      if (mode === "floor") {
        await api(`/blocks/${form.get("blockId")}/floors`, {
          method: "POST",
          body: JSON.stringify({ floorNumber: Number(form.get("floorNumber")), name: form.get("name") }),
        });
      }
      if (mode === "apartment") {
        await api("/apartments", {
          method: "POST",
          body: JSON.stringify({
            floorId: form.get("floorId"),
            code: form.get("code"),
            areaSqm: form.get("areaSqm") || null,
            bedroomCount: form.get("bedroomCount") || null,
            bathroomCount: form.get("bathroomCount") || null,
          }),
        });
      }
      (event.currentTarget as HTMLFormElement).reset();
      blocks.reload();
      apartments.reload();
      notify("Đã lưu cấu trúc căn hộ.");
    } catch (reason) {
      setMessage((reason as Error).message);
    }
  }

  return (
    <>
      <PageHeading title="Căn hộ" subtitle="Xem mặt bằng và thêm khối, tầng hoặc căn hộ." />
      <div className="toolbar-row">
        <label className="select-label">
          Tòa nhà
          <select value={selectedBuilding} onChange={(event) => setSelectedBuilding(event.target.value)}>
            <option value="">Tất cả tòa nhà</option>
            {(buildings.data ?? []).map((building) => (
              <option key={building.id} value={building.id}>
                {building.name}
              </option>
            ))}
          </select>
        </label>
        {canManage && (
          <div className="segmented" role="group" aria-label="Loại cấu trúc cần thêm">
            {(["block", "floor", "apartment"] as const).map((item) => (
              <button
                className={mode === item ? "segment-active" : ""}
                key={item}
                onClick={() => setMode(item)}
              >
                {item === "block" ? "Khối" : item === "floor" ? "Tầng" : "Căn hộ"}
              </button>
            ))}
          </div>
        )}
      </div>
      {canManage && (
        <form className="surface inline-form structure-form" onSubmit={create}>
          <div className="form-title">
            <span className="step-tag">Cấu trúc</span>
            <h2>{mode === "block" ? "Thêm khối nhà" : mode === "floor" ? "Thêm tầng" : "Thêm căn hộ"}</h2>
          </div>
          {mode === "block" && (
            <>
              <label>
                Tòa nhà
                <select
                  required
                  value={selectedBuilding}
                  onChange={(event) => setSelectedBuilding(event.target.value)}
                  name="building"
                >
                  <option value="">Chọn tòa nhà</option>
                  {(buildings.data ?? []).map((building) => (
                    <option key={building.id} value={building.id}>
                      {building.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Mã khối
                <input name="code" required placeholder="A" />
              </label>
              <label>
                Tên khối
                <input name="name" required placeholder="Khối A" />
              </label>
            </>
          )}
          {mode === "floor" && (
            <>
              <label>
                Khối nhà
                <select required name="blockId">
                  <option value="">Chọn khối</option>
                  {(blocks.data ?? []).map((block) => (
                    <option key={block.id} value={block.id}>
                      {block.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Số tầng
                <input type="number" name="floorNumber" required />
              </label>
              <label>
                Tên tầng
                <input name="name" placeholder="Không bắt buộc" />
              </label>
            </>
          )}
          {mode === "apartment" && (
            <>
              <label>
                Tầng
                <select required name="floorId">
                  <option value="">Chọn tầng</option>
                  {flatFloors.map((floor) => (
                    <option key={floor.id} value={floor.id}>
                      {floor.block.name} · Tầng {floor.floorNumber}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Mã căn hộ
                <input name="code" required placeholder="A-1201" />
              </label>
              <label>
                Diện tích (m²)
                <input type="number" min="1" step="0.01" name="areaSqm" />
              </label>
              <label>
                Phòng ngủ
                <input type="number" min="0" name="bedroomCount" />
              </label>
              <label>
                Phòng tắm
                <input type="number" min="0" name="bathroomCount" />
              </label>
            </>
          )}
          {message && <ErrorBanner message={message} />}
          <button
            className="button button-primary"
            disabled={mode !== "block" && !flatFloors.length && mode !== "floor"}
          >
            Lưu cấu trúc
          </button>
        </form>
      )}
      <section className="surface table-surface">
        <div className="table-header">
          <h2>Danh sách căn hộ</h2>
          <span>{selectedUnits.length} căn</span>
        </div>
        {apartments.loading ? (
          <LoadingLine />
        ) : apartments.error ? (
          <ErrorBanner message={apartments.error} />
        ) : selectedUnits.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Căn hộ</th>
                  <th>Tòa nhà</th>
                  <th>Khối / tầng</th>
                  <th>Diện tích</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {selectedUnits.map((unit) => (
                  <tr key={unit.id}>
                    <td>
                      <strong className="table-primary">{unit.code}</strong>
                    </td>
                    <td>{unit.building_name}</td>
                    <td>
                      {unit.block_name} / {unit.floor_number}
                    </td>
                    <td>{unit.area_sqm ? `${unit.area_sqm} m²` : "—"}</td>
                    <td>
                      <StatusTag value={unit.operational_status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="Chưa có căn hộ"
            text="Tạo khối nhà và tầng trước, sau đó thêm căn hộ vào mặt bằng."
          />
        )}
      </section>
    </>
  );
}
