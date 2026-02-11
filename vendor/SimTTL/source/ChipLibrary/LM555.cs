// ================================================
//
// SPDX-FileCopyrightText: 2025 Stefan Warnke
//
// SPDX-License-Identifier: BeerWare
//
//=================================================

//#define DEBUG_WRITE
#define FULL_CALC

using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

using SimBase;

namespace ChipLibrary
{
    /// <summary>
    /// Class definition of the timer chip LM555.
    /// </summary>
    public class LM555:BaseElement
    {
        // Datasheet: https://www.ti.com/lit/ds/symlink/lm555.pdf

        #region Private/Protected Fields
        private const double MAX_R = 1e9;

        private double tcycle;
        private double tlast;
        private double tauChg;
        private double tauDis;
        private bool charging;


#if FULL_CALC
        private double Vdis;
        private double Vthr;
        private double VthrH;
        private double VthrL;
#else
        private bool charging0;
        private double t0ch;
        private double tchg;
        private double tdis;
#endif
        #endregion Private/Protected Fields

        #region Pins
        public Pin TR;
        public Pin R;
        public Pin Q;
        #endregion Pins

        #region Public Fields
        public double Vcc;
        public double Rvcc2dis;
        public double Rdis2thr;
        public double Cthr;
        #endregion Public Fields

        #region Constructors
        /// <summary>
        /// Creates the instance without net connections.
        /// </summary>
        /// <param name="Name">Name of the element.</param>
        public LM555(string Name) : this(Name,null, null, 5.0, 1e3, 1e3, 0.01e-6) {}

        /// <summary>
        /// Creates the instance including input net connections.
        /// </summary>
        /// <param name="Name">Name of the element.</param>
        public LM555(string Name, Net NetTR, Net NetR, double Vcc, double Rvcc2dis, double Rdis2thr, double Cthr):base(Name)
        {
            this.Vcc        = Vcc;
            this.Rvcc2dis   = Rvcc2dis;
            this.Rdis2thr   = Rdis2thr;
            this.Cthr       = Cthr;

            this.Power[0] = new Pin(this, "VCC", "8");
            this.Ground[0] = new Pin(this, "GND", "1");


            this.TR = new Pin(this, "TR", "2", LineMode.In, SignalState.H, NetTR);
            this.R = new Pin(this, "R", "4", LineMode.In, SignalState.H, NetR);
            this.Q = new Pin(this, "Q", "3", LineMode.Out, SignalState.H, 50);
            tcycle = 0;
            tlast = 0;
            charging = true;

            if ((Rvcc2dis >= MAX_R) && (Rdis2thr >= MAX_R))
                tauChg = 0;
            else
                tauChg = (Rvcc2dis + Rdis2thr) * Cthr;

            if (Rdis2thr >= MAX_R)
                tauDis = 0;
            else
                tauDis = Rdis2thr * Cthr;


#if FULL_CALC
            Vdis = 0;
            Vthr = 0;
            VthrH = Vcc * 2 / 3;
            VthrL = Vcc / 3;
#else

            charging0 = true;
            t0ch = 1.1 * tauChg;
            tchg = 0.693 * tauChg;
            tdis = 0.693 * tauDis;
#endif
            Inputs = new Pin[2][];
            SetPinArray(Inputs, 0, this.R);
            SetPinArray(Inputs, 1, this.TR);

            Outputs = new Pin[1][];
            SetPinArray(Outputs, 0, this.Q);
        }
        #endregion Constructors

        #region Public Methods
        /// <summary>
        /// Restart the simulation.
        /// </summary>
        public override void SimulationRestart()
        {
            base.SimulationRestart();
            tcycle = 0;
            tlast = 0;
            charging = true;

#if FULL_CALC
            Vdis = 0;
            Vthr = 0;
#else

            charging0 = true;
#endif
        }

#if FULL_CALC
        /// <summary>
        /// Perform the full analog math calculation.
        /// </summary>
        /// <param name="Time">Time value to update to.</param>
        protected void FullCalc(double Time)
        {
            double tstep = Time - tlast;
            tlast = Time;

            if (Cthr == 0)
            {
                if ((Rvcc2dis >= MAX_R) && (Rdis2thr >= MAX_R))
                {
                    Vdis = 0;
                    Vthr = 0;
                }
                else
                {
                    if (Rvcc2dis <= double.MaxValue)
                        Vdis = Vcc;

                    if (Rdis2thr <= double.MaxValue)
                        Vthr = Vdis;
                }
            }
            else
            {
                if (charging)
                {
                    tcycle += tstep * 1e-9;
                    Vthr = Vcc * (1 - Math.Exp(-tcycle / tauChg));
                    if (Vthr >= VthrH)
                    {
                        tcycle = 0;
                        charging = false;
                        Q.NewOutState = SignalState.L;
                    }
                }
                else
                {
                    tcycle += tstep * 1e-9;
                    Vthr = VthrH * Math.Exp(-tcycle / tauDis);
                    if (Vthr <= VthrL)
                    {
                        tcycle = -tauChg*Math.Log(1- Vthr/Vcc);
                        charging = true;
                        Q.NewOutState = SignalState.H;
                    }
                }
            }

#if DEBUG_WRITE
            if (Name == "U3")
                Debug.WriteLine("Name="+Name+",Time="+ Time.ToString()+",tcycle=" + (tcycle*1e9).ToString("F0") + ",charging=" + charging .ToString()+ ",Vthr=" + Vthr.ToString("F3") + ",Q.NewOutState=" + Q.NewOutState.ToString());
#endif
        }
#else
        /// <summary>
        /// Perform a simplified and faster calculation.
        /// </summary>
        /// <param name="Time">Time value to update to.</param>
        protected void SimpleCalc(double Time)
        {
            double tstep = Time - tlast;
            tlast = Time;
            tcycle += tstep * 1e-9;

            if (charging0)
            {
                if (tcycle>= t0ch)
                {
                    charging0 = false;
                    charging = false;
                    tcycle = 0;
                    Q.NewOutState = SignalState.L;
                }
            }
            else if (charging)
            {
                if (tcycle >= tchg)
                {
                    charging = false;
                    tcycle = 0;
                    Q.NewOutState = SignalState.L;
                }
            }
            else
            {
                if (tcycle >= tdis)
                {
                    charging = true;
                    tcycle = 0;
                    Q.NewOutState = SignalState.H;
                }
            }
        }
#endif

        /// <summary>
        /// Update outputs and inputs to the simulation time.
        /// </summary>
        /// <param name="Time">Time value to update to.</param>
        public override void Update(double Time)
        {
            base.Update(Time);
#if FULL_CALC
            FullCalc(Time);
#else
            SimpleCalc(Time);
#endif
        }
        #endregion Public Methods

    }
}
