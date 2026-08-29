"use client";

import {
  Alert,
  Button,
  Card,
  Checkbox,
  Chip,
  Description,
  Input,
  Label,
  ListBox,
  Modal,
  Select,
  Table,
  TextField,
} from "@heroui/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, UserCog } from "lucide-react";
import { useMemo, useState } from "react";
import {
  GRUPOS_PERMISOS_UI,
  PERMISO_DESCRIPCION,
  ROLES,
  esNoDelegable,
  tienePermiso,
  type ActorPublico,
  type PermisoCodigo,
  type Rol,
} from "@misupertostada/shared";
import { api } from "@/lib/api";
import { toastFromError, toastSuccess } from "@/lib/toast";
import { EmptyState } from "@/components/ui/empty-state";
import { RowSkeleton } from "@/components/ui/skeleton";

/* El enum del backend se lee en mayúsculas y con guion bajo; en pantalla se
   escribe como lo dice el negocio. El valor guardado no cambia. */
const ROL_ETIQUETA: Record<Rol, string> = {
  ADMIN_JEFE: "Admin jefe",
  ADMIN: "Admin",
  PRODUCCION: "Producción",
  TIENDA: "Tienda",
  REPARTO: "Reparto",
};

const ROL_CONSECUENCIA: Record<Rol, string> = {
  ADMIN_JEFE: "Ve todo y es el único que administra cuentas.",
  ADMIN: "Opera el día completo, sin administrar cuentas.",
  PRODUCCION: "Hoja de producción y cierre de planta.",
  TIENDA: "Captura pedidos y cobros de mostrador.",
  REPARTO: "Entrega en ruta y cobra en la puerta.",
};

const MIN_CLAVE = 10;

export function UsuariosCard() {
  const qc = useQueryClient();
  const [crear, setCrear] = useState(false);
  const [detalle, setDetalle] = useState<ActorPublico | null>(null);
  const [clave, setClave] = useState<ActorPublico | null>(null);

  const lista = useQuery({
    queryKey: ["usuarios"],
    queryFn: () => api<ActorPublico[]>("/usuarios"),
  });

  const usuarios = useMemo(() => lista.data ?? [], [lista.data]);
  const activos = usuarios.filter((u) => u.activo).length;

  return (
    <Card className="w-full">
      <Card.Header className="flex flex-row items-start justify-between gap-4">
        <div className="min-w-0">
          <Card.Title>Usuarios</Card.Title>
          <Card.Description>
            Cuentas internas del panel. Nada se borra: se desactiva, y el
            historial de esa cuenta se conserva.
          </Card.Description>
        </div>
        <Button
          className="shrink-0"
          size="sm"
          variant="primary"
          onPress={() => setCrear(true)}
        >
          <Plus size={16} aria-hidden />
          Nuevo usuario
        </Button>
      </Card.Header>

      <Card.Content className="p-0">
        {lista.isLoading ? (
          <RowSkeleton rows={4} />
        ) : (
          <Table>
            <Table.ScrollContainer>
              <Table.Content
                aria-label="Cuentas internas"
                className="min-w-[560px]"
              >
                <Table.Header>
                  <Table.Column isRowHeader id="usuario">
                    Usuario
                  </Table.Column>
                  <Table.Column id="rol">Rol</Table.Column>
                  <Table.Column id="permisos">Permisos extra</Table.Column>
                  <Table.Column id="estado">Estado</Table.Column>
                  <Table.Column id="accion">Detalle</Table.Column>
                </Table.Header>
                <Table.Body
                  items={usuarios}
                  renderEmptyState={() => (
                    <EmptyState
                      icon={<UserCog size={22} aria-hidden />}
                      title="No hay cuentas todavía"
                      description="Cree la cuenta de quien va a capturar pedidos o repartir; el rol define de entrada a qué entra."
                      action={
                        <Button
                          size="sm"
                          variant="primary"
                          onPress={() => setCrear(true)}
                        >
                          Nuevo usuario
                        </Button>
                      }
                    />
                  )}
                >
                  {(u: ActorPublico) => (
                    <Table.Row id={u.id}>
                      <Table.Cell className="font-semibold text-tinta-900">
                        {u.username}
                      </Table.Cell>
                      <Table.Cell className="text-tinta-700">
                        {ROL_ETIQUETA[u.rol]}
                      </Table.Cell>
                      <Table.Cell className="tabular-nums text-tinta-500">
                        {contarDelegados(u)}
                      </Table.Cell>
                      <Table.Cell>
                        <Chip
                          color={u.activo ? "success" : "warning"}
                          size="sm"
                          variant="soft"
                        >
                          {u.activo ? "Activa" : "Inactiva"}
                        </Chip>
                      </Table.Cell>
                      <Table.Cell className="text-right">
                        <Button
                          aria-label={`Abrir la cuenta de ${u.username}`}
                          size="sm"
                          variant="tertiary"
                          onPress={() => setDetalle(u)}
                        >
                          Abrir
                        </Button>
                      </Table.Cell>
                    </Table.Row>
                  )}
                </Table.Body>
              </Table.Content>
            </Table.ScrollContainer>
          </Table>
        )}
      </Card.Content>

      <Card.Footer className="justify-between">
        <p className="mst-label tabular-nums" aria-live="polite">
          {lista.isLoading
            ? "Cargando cuentas…"
            : `${activos} activas de ${usuarios.length}`}
        </p>
      </Card.Footer>

      <CrearModal
        abierto={crear}
        onOpenChange={setCrear}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ["usuarios"] });
          setCrear(false);
        }}
      />
      {detalle ? (
        <DetalleModal
          usuario={detalle}
          onClose={() => setDetalle(null)}
          onReset={() => {
            setClave(detalle);
            setDetalle(null);
          }}
          onChanged={(next) => {
            qc.invalidateQueries({ queryKey: ["usuarios"] });
            setDetalle(next);
          }}
        />
      ) : null}
      {clave ? (
        <ResetModal
          usuario={clave}
          onClose={() => setClave(null)}
          onOk={() => setClave(null)}
        />
      ) : null}
    </Card>
  );
}

/** Permisos otorgados a mano, aparte del paquete que ya trae el rol. */
function contarDelegados(u: ActorPublico): string {
  const n = u.permisos.filter((p) => !esNoDelegable(p)).length;
  return n === 0 ? "—" : String(n);
}

const VACIO = { username: "", password: "" };

function CrearModal({
  abierto,
  onOpenChange,
  onSaved,
}: {
  abierto: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [campos, setCampos] = useState(VACIO);
  const [rol, setRol] = useState<Rol>("ADMIN");
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof typeof VACIO) => (value: string) =>
    setCampos((prev) => ({ ...prev, [k]: value }));

  const guardar = useMutation({
    mutationFn: () =>
      api("/usuarios", {
        method: "POST",
        body: JSON.stringify({
          username: campos.username.trim(),
          password: campos.password,
          rol,
        }),
      }),
    onSuccess: () => {
      toastSuccess("Cuenta creada");
      setCampos(VACIO);
      setRol("ADMIN");
      setError(null);
      onSaved();
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "No se pudo crear");
      toastFromError(err, "Ocurrió un error");
    },
  });

  const listo =
    campos.username.trim().length > 0 && campos.password.length >= MIN_CLAVE;

  return (
    <Modal.Backdrop isOpen={abierto} onOpenChange={onOpenChange}>
      <Modal.Container size="lg">
        <Modal.Dialog>
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Heading>Nuevo usuario</Modal.Heading>
            <p className="text-sm text-tinta-500">
              La cuenta queda activa de una vez y entra con la clave que escriba
              aquí.
            </p>
          </Modal.Header>

          <Modal.Body>
            <form
              id="usuario-nuevo"
              className="grid gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (listo) guardar.mutate();
              }}
            >
              <TextField
                isRequired
                value={campos.username}
                onChange={set("username")}
              >
                <Label>Usuario</Label>
                <Input autoComplete="off" placeholder="Ej. carla" />
                <Description>Con esto entra al panel. No se cambia después.</Description>
              </TextField>

              <TextField
                isRequired
                type="password"
                value={campos.password}
                onChange={set("password")}
              >
                <Label>Contraseña</Label>
                <Input autoComplete="new-password" />
                <Description>Mínimo {MIN_CLAVE} caracteres.</Description>
              </TextField>

              <Select
                placeholder="Elija el rol"
                value={rol}
                onChange={(value) => {
                  if (typeof value === "string") setRol(value as Rol);
                }}
              >
                <Label>Rol</Label>
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Description>
                  Define el paquete base de permisos. Los extras se otorgan uno
                  por uno al abrir la cuenta.
                </Description>
                <Select.Popover>
                  <ListBox>
                    {ROLES.map((r) => (
                      <ListBox.Item key={r} id={r} textValue={ROL_ETIQUETA[r]}>
                        {ROL_ETIQUETA[r]}
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>

              <p className="text-xs leading-relaxed text-tinta-500">
                {ROL_CONSECUENCIA[rol]}
              </p>

              {error && (
                <Alert status="danger">
                  <Alert.Indicator />
                  <Alert.Content>
                    <Alert.Title>No se creó la cuenta</Alert.Title>
                    <Alert.Description>{error}</Alert.Description>
                  </Alert.Content>
                </Alert>
              )}
            </form>
          </Modal.Body>

          <Modal.Footer>
            <Button variant="tertiary" onPress={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              form="usuario-nuevo"
              isDisabled={!listo || guardar.isPending}
              type="submit"
              variant="primary"
            >
              {guardar.isPending ? "Un momento…" : "Crear cuenta"}
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}

function DetalleModal({
  usuario,
  onClose,
  onReset,
  onChanged,
}: {
  usuario: ActorPublico;
  onClose: () => void;
  onReset: () => void;
  onChanged: (u: ActorPublico) => void;
}) {
  const rolMut = useMutation({
    mutationFn: (rol: Rol) =>
      api<ActorPublico>(`/usuarios/${usuario.id}/rol`, {
        method: "PATCH",
        body: JSON.stringify({ rol }),
      }),
    onSuccess: (u) => {
      toastSuccess("Rol actualizado");
      onChanged(u);
    },
    onError: (err) => toastFromError(err, "Ocurrió un error"),
  });
  const activoMut = useMutation({
    mutationFn: (activo: boolean) =>
      activo
        ? api<ActorPublico>(`/usuarios/${usuario.id}/activar`, {
            method: "PATCH",
            body: JSON.stringify({ activo: true }),
          })
        : api<{ ok: true }>(`/usuarios/${usuario.id}/desactivar`, {
            method: "PATCH",
          }).then(() => ({ ...usuario, activo: false })),
    onSuccess: (u) => {
      toastSuccess(u.activo ? "Cuenta reactivada" : "Cuenta desactivada");
      onChanged(u);
    },
    onError: (err) => toastFromError(err, "Ocurrió un error"),
  });
  const permMut = useMutation({
    mutationFn: (body: { codigo: PermisoCodigo; granted: boolean }) =>
      api<ActorPublico>(`/usuarios/${usuario.id}/permisos`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: (u) => onChanged(u),
    onError: (err) => toastFromError(err, "Ocurrió un error"),
  });

  const noDelegables = useMemo(
    () => usuario.permisos.filter((p) => esNoDelegable(p)),
    [usuario.permisos],
  );

  return (
    <Modal.Backdrop
      isOpen
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Modal.Container size="lg">
        <Modal.Dialog>
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Heading>{usuario.username}</Modal.Heading>
            <div className="flex flex-wrap items-center gap-2">
              <Chip
                color={usuario.activo ? "success" : "warning"}
                size="sm"
                variant="soft"
              >
                {usuario.activo ? "Cuenta activa" : "Cuenta inactiva"}
              </Chip>
              <Chip size="sm" variant="soft">
                {ROL_ETIQUETA[usuario.rol]}
              </Chip>
            </div>
          </Modal.Header>

          <Modal.Body>
            <div className="grid gap-6">
              <Select
                value={usuario.rol}
                onChange={(value) => {
                  if (typeof value === "string" && value !== usuario.rol) {
                    rolMut.mutate(value as Rol);
                  }
                }}
              >
                <Label>Rol</Label>
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Description>
                  Se aplica al guardar el cambio, en el acto:{" "}
                  {ROL_CONSECUENCIA[usuario.rol]}
                </Description>
                <Select.Popover>
                  <ListBox>
                    {ROLES.map((r) => (
                      <ListBox.Item key={r} id={r} textValue={ROL_ETIQUETA[r]}>
                        {ROL_ETIQUETA[r]}
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>

              <div className="grid gap-4">
                <div>
                  <p className="mst-label">Acceso a módulos</p>
                  <p className="mt-1 text-xs leading-relaxed text-tinta-500">
                    Cada casilla se guarda sola. Quitar una saca el módulo del
                    menú de esta persona en su próxima carga.
                  </p>
                </div>

                {GRUPOS_PERMISOS_UI.map((g) => (
                  <fieldset key={g.grupo} className="grid gap-2">
                    <legend className="text-xs font-semibold text-tinta-700">
                      {g.grupo}
                    </legend>
                    {g.permisos.map((codigo) => (
                      <Checkbox
                        key={codigo}
                        isDisabled={permMut.isPending}
                        isSelected={tienePermiso(usuario.permisos, codigo)}
                        onChange={(granted) => permMut.mutate({ codigo, granted })}
                      >
                        <Checkbox.Content>
                          <Checkbox.Control>
                            <Checkbox.Indicator />
                          </Checkbox.Control>
                          {PERMISO_DESCRIPCION[codigo]}
                        </Checkbox.Content>
                      </Checkbox>
                    ))}
                  </fieldset>
                ))}

                {noDelegables.length > 0 ? (
                  <div className="grid gap-2 rounded-campo bg-[var(--ink-50)] p-3">
                    <p className="mst-label text-[11px]">
                      Ligados al rol (no se quitan a mano)
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {noDelegables.map((p) => (
                        <Chip key={p} size="sm" variant="soft">
                          {PERMISO_DESCRIPCION[p]}
                        </Chip>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </Modal.Body>

          <Modal.Footer className="justify-between">
            <Button variant="tertiary" onPress={onReset}>
              Restablecer clave
            </Button>
            {usuario.activo ? (
              <Button
                isDisabled={activoMut.isPending}
                variant="danger"
                onPress={() => activoMut.mutate(false)}
              >
                {activoMut.isPending ? "Un momento…" : "Desactivar cuenta"}
              </Button>
            ) : (
              <Button
                isDisabled={activoMut.isPending}
                variant="primary"
                onPress={() => activoMut.mutate(true)}
              >
                {activoMut.isPending ? "Un momento…" : "Reactivar cuenta"}
              </Button>
            )}
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}

function ResetModal({
  usuario,
  onClose,
  onOk,
}: {
  usuario: ActorPublico;
  onClose: () => void;
  onOk: () => void;
}) {
  const [password, setPassword] = useState("");
  const mut = useMutation({
    mutationFn: () =>
      api(`/usuarios/${usuario.id}/password`, {
        method: "PATCH",
        body: JSON.stringify({ password }),
      }),
    onSuccess: () => {
      toastSuccess("Clave actualizada");
      setPassword("");
      onOk();
    },
    onError: (err) => toastFromError(err, "Ocurrió un error"),
  });

  const listo = password.length >= MIN_CLAVE;

  return (
    <Modal.Backdrop
      isOpen
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Modal.Container size="md">
        <Modal.Dialog>
          <Modal.CloseTrigger />
          <Modal.Header>
            <Modal.Heading>Clave de {usuario.username}</Modal.Heading>
            <p className="text-sm text-tinta-500">
              La sesión abierta de esta persona se corta y tiene que entrar con
              la clave nueva.
            </p>
          </Modal.Header>

          <Modal.Body>
            <form
              id="usuario-clave"
              onSubmit={(e) => {
                e.preventDefault();
                if (listo) mut.mutate();
              }}
            >
              <TextField
                isRequired
                type="password"
                value={password}
                onChange={setPassword}
              >
                <Label>Nueva contraseña</Label>
                <Input autoComplete="new-password" />
                <Description>Mínimo {MIN_CLAVE} caracteres.</Description>
              </TextField>
            </form>
          </Modal.Body>

          <Modal.Footer>
            <Button variant="tertiary" onPress={onClose}>
              Cancelar
            </Button>
            <Button
              form="usuario-clave"
              isDisabled={!listo || mut.isPending}
              type="submit"
              variant="primary"
            >
              {mut.isPending ? "Un momento…" : "Guardar clave"}
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
