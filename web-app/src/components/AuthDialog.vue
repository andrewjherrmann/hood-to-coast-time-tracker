<template>
  <q-dialog v-model="show" persistent>
    <q-card style="min-width: 400px;">
      <q-card-section>
        <div class="text-h6">Sign In</div>
      </q-card-section>

      <q-card-section class="q-pt-none">
        <q-form @submit="handleSubmit" class="q-gutter-md">
          <!-- Mock Credentials Hint -->
          <div class="q-mb-md">
            <q-banner class="bg-info-1 text-info-9">
              <template v-slot:avatar>
                <q-icon name="info" color="info" />
              </template>
              <div><strong>Mock Mode:</strong> Available test accounts:</div>
              <div class="q-mt-xs">
                <div>• admin@example.com / password</div>
                <div>• john@example.com / password</div>
                <div>• jane@example.com / password</div>
              </div>
            </q-banner>
          </div>

          <q-input
            v-model="form.email"
            label="Email"
            type="email"
            outlined
            dense
            :rules="[
              val => !!val || 'Email is required',
              val => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val) || 'Invalid email format'
            ]"
          />

          <q-input
            v-model="form.password"
            label="Password"
            type="password"
            outlined
            dense
            :rules="[
              val => !!val || 'Password is required',
              val => val.length >= 8 || 'Password must be at least 8 characters'
            ]"
          />

          <div class="row justify-end q-gutter-sm">
            <q-btn
              flat
              label="Cancel"
              color="primary"
              @click="closeDialog"
              :disable="isSubmitting"
            />
            <q-btn
              unelevated
              :label="isSubmitting ? 'Signing In...' : 'Sign In'"
              color="primary"
              type="submit"
              :loading="isSubmitting"
              :disable="!form.email || !form.password"
            />
          </div>
          
          <!-- Debug: Test button to bypass form validation -->
          <div class="row justify-center q-mt-md">
            <q-btn
              flat
              label="Test: Sign in as Admin"
              color="secondary"
              @click="testSignIn"
              size="sm"
            />
          </div>
        </q-form>
      </q-card-section>

      <q-card-section class="text-center q-pt-none">
        <div class="text-caption">
          Need access? Contact your team administrator to get invited.
        </div>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { reactive, computed, ref } from 'vue';
import { useQuasar } from 'quasar';
import { useHoodToCoastStore } from '../stores/hood-to-coast-store';

interface Props {
  modelValue: boolean;
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const $q = useQuasar();
const store = useHoodToCoastStore();

// Store is now properly accessible without debug logging

const show = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
});

const form = reactive({
  email: '',
  password: ''
});

const isSubmitting = ref(false);

function closeDialog() {
  show.value = false;
  // Reset form
  form.email = '';
  form.password = '';
  isSubmitting.value = false;
}

async function handleSubmit() {
  console.log('=== AUTH DEBUG START ===');
  console.log('Form submitted with:', { email: form.email, password: form.password });
  console.log('Password length:', form.password.length);
  console.log('Form validation should pass:', form.email && form.password && form.password.length >= 8);
  
  isSubmitting.value = true;
  
  try {
    console.log('Calling store.signIn...');
    const success = await store.signIn(form.email, form.password);
    console.log('Sign in result:', success);
    console.log('Store auth state:', store.isAuthenticated);
    console.log('Store current user:', store.currentUser);
    
    if (success) {
      console.log('✅ Successfully signed in!');
      $q.notify({
        type: 'positive',
        message: 'Successfully signed in!'
      });
      closeDialog();
    } else {
      console.log('❌ Invalid email or password');
      console.log('Available mock users:', [
        { email: 'admin@example.com', password: 'password' },
        { email: 'john@example.com', password: 'password' },
        { email: 'jane@example.com', password: 'password' }
      ]);
      $q.notify({
        type: 'negative',
        message: 'Invalid email or password. Please try again.'
      });
    }
  } catch (error) {
    console.error('Sign in error:', error);
    $q.notify({
      type: 'negative',
      message: 'An error occurred during sign in. Please try again.'
    });
  } finally {
    isSubmitting.value = false;
    console.log('=== AUTH DEBUG END ===');
  }
}

async function testSignIn() {
  console.log('=== TEST SIGN IN START ===');
  console.log('Attempting to sign in as admin@example.com / password');
  const success = await store.signIn('admin@example.com', 'password');
  console.log('Test sign in result:', success);
  console.log('Store auth state after test:', store.isAuthenticated);
  console.log('Store current user after test:', store.currentUser);
  $q.notify({
    type: success ? 'positive' : 'negative',
    message: success ? 'Successfully signed in as admin!' : 'Failed to sign in as admin.'
  });
  console.log('=== TEST SIGN IN END ===');
}
</script>
